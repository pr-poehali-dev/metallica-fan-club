import os
import json
import psycopg2  # noqa

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    'Content-Type': 'application/json',
}

S3_CONFIGS = [
    ('s3', 'endpoint',       'https://bucket.poehali.dev'),
    ('s3', 'bucket_name',    'files'),
    ('s3', 'access_key_id',  None),   # из AWS_ACCESS_KEY_ID
    ('s3', 'secret_key',     None),   # из AWS_SECRET_ACCESS_KEY
]


def upsert_config(cur, service_name: str, config_key: str, config_value: str):
    cur.execute(
        """
        INSERT INTO service_config (service_name, config_key, config_value, updated_at)
        VALUES (%s, %s, %s, now())
        ON CONFLICT (service_name, config_key)
        DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = now()
        """,
        (service_name, config_key, config_value),
    )


def handler(event: dict, context) -> dict:
    """
    Синхронизирует конфигурацию S3 из переменных окружения в таблицу service_config.
    GET  — читает текущие значения из БД.
    POST — записывает/обновляет значения из env в БД.
    Защищён заголовком X-Admin-Token.
    """

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS_HEADERS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    token = event.get('headers', {}).get('X-Admin-Token') or event.get('headers', {}).get('x-admin-token')
    if token != os.environ.get('ADMIN_TOKEN'):
        return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Unauthorized'})}

    method = event.get('httpMethod', 'GET')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    if method == 'POST':
        values = {
            'endpoint':      'https://bucket.poehali.dev',
            'bucket_name':   'files',
            'access_key_id': os.environ.get('AWS_ACCESS_KEY_ID', ''),
            'secret_key':    os.environ.get('AWS_SECRET_ACCESS_KEY', ''),
        }
        for key, value in values.items():
            upsert_config(cur, 's3', key, value)
        conn.commit()

        saved = [{'service_name': 's3', 'config_key': k} for k in values]
        cur.close()
        conn.close()
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'status': 'synced', 'saved': saved}, ensure_ascii=False),
        }

    cur.execute(
        "SELECT service_name, config_key, config_value, updated_at::text FROM service_config ORDER BY service_name, config_key"
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    configs = []
    for row in rows:
        key = row[1]
        value = row[2]
        configs.append({
            'service_name': row[0],
            'config_key':   key,
            'config_value': '***' if key == 'secret_key' else value,
            'updated_at':   row[3],
        })

    return {
        'statusCode': 200,
        'headers': CORS_HEADERS,
        'body': json.dumps({'status': 'ok', 'configs': configs}, ensure_ascii=False),
    }