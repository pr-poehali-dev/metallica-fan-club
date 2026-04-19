import os
import json
import psycopg2
import psycopg2.extensions


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    'Content-Type': 'application/json',
}


def handler(event: dict, context) -> dict:
    """Health check базы данных. Защищён токеном ADMIN_TOKEN."""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS_HEADERS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    token = event.get('headers', {}).get('X-Admin-Token') or event.get('headers', {}).get('x-admin-token')
    if token != os.environ.get('ADMIN_TOKEN'):
        return {
            'statusCode': 401,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Unauthorized'}),
        }

    dsn = os.environ['DATABASE_URL']
    params = psycopg2.extensions.parse_dsn(dsn)

    safe_params = {
        'host': params.get('host', '—'),
        'port': params.get('port', '5432'),
        'dbname': params.get('dbname', '—'),
        'user': params.get('user', '—'),
        'password': '***',
    }

    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    cur.execute('SELECT version(), now()::text')
    row = cur.fetchone()
    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': CORS_HEADERS,
        'body': json.dumps({
            'status': 'ok',
            'connection': safe_params,
            'pg_version': row[0],
            'server_time': row[1],
        }, ensure_ascii=False),
    }
