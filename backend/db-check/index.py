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
    """Мониторинг базы данных: статус, метрики, таблицы, соединения."""

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

    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    cur.execute('SELECT version(), now()::text')
    row = cur.fetchone()
    pg_version = row[0]
    server_time = row[1]

    cur.execute("SELECT pg_size_pretty(pg_database_size(current_database())), pg_database_size(current_database())")
    size_row = cur.fetchone()

    cur.execute("""
        SELECT count(*) FROM pg_stat_activity
        WHERE datname = current_database()
    """)
    active_connections = cur.fetchone()[0]

    cur.execute("""
        SELECT
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
            pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
            n_live_tup as rows_estimate
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20
    """)
    tables = []
    for r in cur.fetchall():
        tables.append({
            'schema': r[0],
            'name': r[1],
            'size': r[2],
            'size_bytes': r[3],
            'rows': r[4],
        })

    cur.execute("""
        SELECT
            state,
            count(*) as cnt
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
    """)
    connections_by_state = {}
    for r in cur.fetchall():
        connections_by_state[r[0] or 'unknown'] = r[1]

    cur.execute("""
        SELECT
            xact_commit,
            xact_rollback,
            blks_read,
            blks_hit,
            CASE WHEN blks_hit + blks_read > 0
                THEN round(100.0 * blks_hit / (blks_hit + blks_read), 2)
                ELSE 100
            END as cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database()
    """)
    stat = cur.fetchone()
    db_stats = {
        'commits': stat[0],
        'rollbacks': stat[1],
        'blocks_read': stat[2],
        'blocks_hit': stat[3],
        'cache_hit_ratio': float(stat[4]),
    }

    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': CORS_HEADERS,
        'body': json.dumps({
            'status': 'ok',
            'connection': {
                'host': params.get('host', '—'),
                'port': params.get('port', '5432'),
                'dbname': params.get('dbname', '—'),
                'user': params.get('user', '—'),
            },
            'pg_version': pg_version,
            'server_time': server_time,
            'db_size': size_row[0],
            'db_size_bytes': size_row[1],
            'active_connections': active_connections,
            'connections_by_state': connections_by_state,
            'tables': tables,
            'db_stats': db_stats,
        }, ensure_ascii=False),
    }
