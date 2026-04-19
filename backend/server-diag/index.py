import os
import json
import platform
import shutil
import pwd

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    'Content-Type': 'application/json',
}


def _read_proc(path: str) -> str:
    try:
        with open(path, 'r') as f:
            return f.read()
    except Exception as e:
        return f'[error: {e}]'


def _parse_meminfo() -> dict:
    raw = _read_proc('/proc/meminfo')
    result = {}
    for line in raw.splitlines():
        if ':' in line:
            key, _, val = line.partition(':')
            result[key.strip()] = val.strip()
    return result


def _parse_uptime() -> dict:
    raw = _read_proc('/proc/uptime')
    parts = raw.strip().split()
    if len(parts) >= 2:
        uptime_sec = float(parts[0])
        idle_sec = float(parts[1])
        h, rem = divmod(int(uptime_sec), 3600)
        m, s = divmod(rem, 60)
        return {
            'uptime_seconds': uptime_sec,
            'uptime_human': f'{h}h {m}m {s}s',
            'idle_seconds': idle_sec,
        }
    return {'raw': raw}


def _parse_self_status() -> dict:
    raw = _read_proc('/proc/self/status')
    result = {}
    for line in raw.splitlines():
        if ':' in line:
            key, _, val = line.partition(':')
            result[key.strip()] = val.strip()
    return result


def _parse_net_tcp() -> list:
    raw = _read_proc('/proc/self/net/tcp')
    lines = raw.strip().splitlines()
    entries = []
    for line in lines[1:]:  # пропускаем заголовок
        parts = line.split()
        if len(parts) < 4:
            continue
        local_raw = parts[1]
        remote_raw = parts[2]
        state_hex = parts[3]

        def decode_addr(addr_hex: str) -> str:
            host_hex, _, port_hex = addr_hex.partition(':')
            try:
                ip = '.'.join(str(int(host_hex[i:i+2], 16)) for i in (6, 4, 2, 0))
                port = int(port_hex, 16)
                return f'{ip}:{port}'
            except Exception:
                return addr_hex

        state_map = {
            '01': 'ESTABLISHED', '02': 'SYN_SENT', '03': 'SYN_RECV',
            '04': 'FIN_WAIT1', '05': 'FIN_WAIT2', '06': 'TIME_WAIT',
            '07': 'CLOSE', '08': 'CLOSE_WAIT', '09': 'LAST_ACK',
            '0A': 'LISTEN', '0B': 'CLOSING',
        }

        entries.append({
            'local': decode_addr(local_raw),
            'remote': decode_addr(remote_raw),
            'state': state_map.get(state_hex.upper(), state_hex),
        })
    return entries


def _disk_usage() -> dict:
    result = {}
    for path in ('/', '/tmp'):
        try:
            u = shutil.disk_usage(path)
            result[path] = {
                'total_mb': round(u.total / 1024 / 1024, 1),
                'used_mb':  round(u.used  / 1024 / 1024, 1),
                'free_mb':  round(u.free  / 1024 / 1024, 1),
                'used_pct': round(u.used / u.total * 100, 1),
            }
        except Exception as e:
            result[path] = {'error': str(e)}
    return result


def _process_identity() -> dict:
    uid = os.getuid()
    gid = os.getgid()
    try:
        pw = pwd.getpwuid(uid)
        username = pw.pw_name
        home = pw.pw_dir
        shell = pw.pw_shell
    except Exception:
        username = home = shell = '—'
    return {
        'uid': uid,
        'gid': gid,
        'username': username,
        'home': home,
        'shell': shell,
        'pid': os.getpid(),
        'ppid': os.getppid(),
    }


def handler(event: dict, context) -> dict:
    """
    Диагностика серверной инфраструктуры через Python API (без subprocess).
    Возвращает: uname, disk, memory, uptime, identity, /proc/self/status, net/tcp.
    Защищён X-Admin-Token.
    """

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS_HEADERS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    token = event.get('headers', {}).get('X-Admin-Token') or event.get('headers', {}).get('x-admin-token')
    if token != os.environ.get('ADMIN_TOKEN'):
        return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Unauthorized'})}

    u = platform.uname()

    try:
        os_release = platform.freedesktop_os_release()
    except Exception:
        os_release = {'error': 'не доступно'}

    report = {
        'uname': {
            'system':    u.system,
            'node':      u.node,
            'release':   u.release,
            'version':   u.version,
            'machine':   u.machine,
            'processor': u.processor,
        },
        'os_release':   os_release,
        'python':       platform.python_version(),
        'identity':     _process_identity(),
        'disk':         _disk_usage(),
        'memory':       _parse_meminfo(),
        'uptime':       _parse_uptime(),
        'proc_status':  _parse_self_status(),
        'net_tcp':      _parse_net_tcp(),
    }

    return {
        'statusCode': 200,
        'headers': CORS_HEADERS,
        'body': json.dumps({'status': 'ok', 'diag': report}, ensure_ascii=False),
    }
