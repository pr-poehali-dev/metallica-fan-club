import os
import json
import time
import traceback
import boto3

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
}

ENDPOINT = 'https://bucket.poehali.dev'
BUCKET = 'files'
PROBE_KEY = '.s3-health-probe'


def handler(event: dict, context) -> dict:
    """Публичная проверка доступности S3-хранилища. Выполняет list, put, get, delete probe-объекта и возвращает детальный отчёт."""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS_HEADERS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    access_key = os.environ.get('AWS_ACCESS_KEY_ID', '')
    secret_key = os.environ.get('AWS_SECRET_ACCESS_KEY', '')

    checks = {}
    overall_ok = True
    cdn_url = f"https://cdn.poehali.dev/projects/{access_key}/bucket/{PROBE_KEY}"

    s3 = None
    try:
        s3 = boto3.client(
            's3',
            endpoint_url=ENDPOINT,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )
    except Exception:
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'status': 'error',
                'error': 'Не удалось создать S3 клиент',
                'traceback': traceback.format_exc(),
                'checks': {},
            }, ensure_ascii=False),
        }

    # CHECK: list_buckets
    t0 = time.monotonic()
    try:
        s3.list_buckets()
        checks['list_buckets'] = {'ok': True, 'ms': round((time.monotonic() - t0) * 1000)}
    except Exception:
        checks['list_buckets'] = {
            'ok': False,
            'ms': round((time.monotonic() - t0) * 1000),
            'error': traceback.format_exc(),
        }
        overall_ok = False

    # CHECK: list_objects (проверка доступа к bucket)
    t0 = time.monotonic()
    try:
        resp = s3.list_objects_v2(Bucket=BUCKET, MaxKeys=5)
        checks['list_objects'] = {
            'ok': True,
            'ms': round((time.monotonic() - t0) * 1000),
            'bucket': BUCKET,
            'key_count': resp.get('KeyCount', 0),
        }
    except Exception:
        checks['list_objects'] = {
            'ok': False,
            'ms': round((time.monotonic() - t0) * 1000),
            'bucket': BUCKET,
            'error': traceback.format_exc(),
        }
        overall_ok = False

    # CHECK: put_object (запись probe)
    t0 = time.monotonic()
    try:
        s3.put_object(
            Bucket=BUCKET,
            Key=PROBE_KEY,
            Body=b's3-health-ok',
            ContentType='text/plain',
        )
        checks['put_object'] = {'ok': True, 'ms': round((time.monotonic() - t0) * 1000), 'key': PROBE_KEY}
    except Exception:
        checks['put_object'] = {
            'ok': False,
            'ms': round((time.monotonic() - t0) * 1000),
            'error': traceback.format_exc(),
        }
        overall_ok = False

    # CHECK: get_object (чтение probe)
    t0 = time.monotonic()
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=PROBE_KEY)
        body = obj['Body'].read().decode('utf-8')
        checks['get_object'] = {
            'ok': True,
            'ms': round((time.monotonic() - t0) * 1000),
            'body': body,
            'content_type': obj.get('ContentType', ''),
            'content_length': obj.get('ContentLength', 0),
        }
    except Exception:
        checks['get_object'] = {
            'ok': False,
            'ms': round((time.monotonic() - t0) * 1000),
            'error': traceback.format_exc(),
        }
        overall_ok = False

    # CHECK: delete_object (удаление probe)
    t0 = time.monotonic()
    try:
        s3.delete_object(Bucket=BUCKET, Key=PROBE_KEY)
        checks['delete_object'] = {'ok': True, 'ms': round((time.monotonic() - t0) * 1000)}
    except Exception:
        checks['delete_object'] = {
            'ok': False,
            'ms': round((time.monotonic() - t0) * 1000),
            'error': traceback.format_exc(),
        }
        overall_ok = False

    return {
        'statusCode': 200,
        'headers': CORS_HEADERS,
        'body': json.dumps({
            'status': 'ok' if overall_ok else 'degraded',
            'endpoint': ENDPOINT,
            'bucket': BUCKET,
            'cdn_url': cdn_url,
            'credentials': {
                'access_key_present': bool(access_key),
                'secret_key_present': bool(secret_key),
                'access_key_prefix': access_key[:6] + '...' if len(access_key) > 6 else access_key,
            },
            'checks': checks,
        }, ensure_ascii=False),
    }