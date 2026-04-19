import os
import json
import types  # noqa
import traceback
import boto3
import psycopg2  # noqa

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    'Content-Type': 'application/json',
}

BUCKET = 'files'


def _s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def _check_registry(key: str) -> dict | None:
    """Возвращает запись из plugin_registry если ключ активен, иначе None."""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cur.execute(
        'SELECT key, description, is_active FROM plugin_registry WHERE key = %s',
        (key,),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row is None or not row[2]:
        return None
    return {'key': row[0], 'description': row[1]}


def _load_plugin(s3_key: str) -> str:
    """Загружает python-скрипт из S3."""
    s3 = _s3_client()
    obj = s3.get_object(Bucket=BUCKET, Key=s3_key)
    return obj['Body'].read().decode('utf-8')


def _execute_plugin(source: str, event: dict) -> object:
    """
    Компилирует и выполняет плагин в изолированном окружении.
    Доступен только безопасный набор встроенных функций.
    Вызывает run(event) и возвращает результат.
    """
    safe_builtins = {
        'print': print,
        'len': len, 'range': range, 'enumerate': enumerate,
        'zip': zip, 'map': map, 'filter': filter,
        'sorted': sorted, 'reversed': reversed,
        'list': list, 'dict': dict, 'set': set, 'tuple': tuple,
        'str': str, 'int': int, 'float': float, 'bool': bool,
        'min': min, 'max': max, 'sum': sum, 'abs': abs, 'round': round,
        'any': any, 'all': all,
        'isinstance': isinstance, 'type': type,
        'Exception': Exception, 'ValueError': ValueError,
        'KeyError': KeyError, 'TypeError': TypeError,
        'json': json,
    }

    sandbox = types.ModuleType('plugin_sandbox')
    sandbox.__dict__['__builtins__'] = safe_builtins

    compiled = compile(source, '<plugin>', 'exec')
    exec(compiled, sandbox.__dict__)  # noqa: S102

    if 'run' not in sandbox.__dict__:
        raise ValueError("Плагин не содержит функцию run()")

    return sandbox.__dict__['run'](event)


def handler(event: dict, context) -> dict:
    """
    Система плагинов с whitelist-защитой.
    Принимает ?key=S3-ключ-плагина, проверяет по plugin_registry,
    загружает скрипт из S3, выполняет run(event) в sandbox-окружении.
    Защищён X-Admin-Token.
    """

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS_HEADERS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    token = event.get('headers', {}).get('X-Admin-Token') or event.get('headers', {}).get('x-admin-token')
    if token != os.environ.get('ADMIN_TOKEN'):
        return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Unauthorized'})}

    query = event.get('queryStringParameters') or {}
    key = query.get('key', '').strip()

    if not key:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Параметр key обязателен'}),
        }

    registry_entry = _check_registry(key)
    if registry_entry is None:
        return {
            'statusCode': 403,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': f"Плагин '{key}' не найден в реестре или отключён"}),
        }

    try:
        source = _load_plugin(key)
    except Exception:
        return {
            'statusCode': 502,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'error': f"Не удалось загрузить плагин '{key}' из S3",
                'traceback': traceback.format_exc(),
            }),
        }

    try:
        result = _execute_plugin(source, event)
    except Exception:
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'error': 'Ошибка выполнения плагина',
                'plugin': registry_entry,
                'traceback': traceback.format_exc(),
            }),
        }

    try:
        json.dumps(result)
    except (TypeError, ValueError):
        result = str(result)

    return {
        'statusCode': 200,
        'headers': CORS_HEADERS,
        'body': json.dumps({
            'status': 'ok',
            'plugin': registry_entry,
            'result': result,
        }, ensure_ascii=False),
    }