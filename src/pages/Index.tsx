import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const DB_CHECK_URL = "https://functions.poehali.dev/eaa9c7bb-865a-4cb7-b17c-5f795dbdbca2";

interface DbData {
  status: string;
  connection: { host: string; port: string; dbname: string; user: string };
  pg_version: string;
  server_time: string;
  db_size: string;
  db_size_bytes: number;
  active_connections: number;
  connections_by_state: Record<string, number>;
  tables: { schema: string; name: string; size: string; size_bytes: number; rows: number }[];
  db_stats: { commits: number; rollbacks: number; blocks_read: number; blocks_hit: number; cache_hit_ratio: number };
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Index() {
  const [token, setToken] = useState(() => localStorage.getItem("admin_token") || "");
  const [tokenInput, setTokenInput] = useState("");
  const [data, setData] = useState<DbData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchData = useCallback(async (t?: string) => {
    const useToken = t ?? token;
    if (!useToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(DB_CHECK_URL, {
        headers: { "X-Admin-Token": useToken },
      });
      if (res.status === 401) {
        setError("Неверный токен доступа");
        setData(null);
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date().toLocaleTimeString("ru-RU"));
    } catch {
      setError("Ошибка соединения с сервером");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!autoRefresh || !token) return;
    const id = setInterval(() => fetchData(), 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, token, fetchData]);

  function handleLogin() {
    const t = tokenInput.trim();
    localStorage.setItem("admin_token", t);
    setToken(t);
    fetchData(t);
  }

  const pgShort = data?.pg_version.match(/PostgreSQL ([\d.]+)/)?.[1] ?? data?.pg_version ?? "—";
  const cacheRatio = data?.db_stats.cache_hit_ratio ?? 0;

  if (!token) {
    return (
      <div className="auth-screen">
        <div className="auth-box animate-fade-in-up">
          <div className="auth-logo">
            <Icon name="Database" size={32} />
          </div>
          <h1>DB Monitor</h1>
          <p>Введите токен администратора для доступа к мониторингу базы данных</p>
          <div className="auth-form">
            <input
              type="password"
              placeholder="ADMIN_TOKEN"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              className="auth-input"
            />
            <button onClick={handleLogin} className="auth-btn">
              Войти
            </button>
          </div>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-header-left">
          <div className="dash-logo">
            <Icon name="Database" size={18} />
          </div>
          <span className="dash-title">DB Monitor</span>
          {data && (
            <span className="dash-badge ok">
              <span className="dot" />
              online
            </span>
          )}
          {error && (
            <span className="dash-badge err">
              <span className="dot" />
              ошибка
            </span>
          )}
        </div>
        <div className="dash-header-right">
          {lastUpdate && <span className="last-update">обновлено {lastUpdate}</span>}
          <button
            className={`ctrl-btn ${autoRefresh ? "active" : ""}`}
            onClick={() => setAutoRefresh(v => !v)}
            title="Автообновление каждые 30с"
          >
            <Icon name="RefreshCw" size={14} />
            {autoRefresh ? "Авто вкл" : "Авто выкл"}
          </button>
          <button
            className="ctrl-btn primary"
            onClick={() => fetchData()}
            disabled={loading}
          >
            {loading ? <Icon name="Loader" size={14} /> : <Icon name="RotateCcw" size={14} />}
            {loading ? "Загрузка..." : "Обновить"}
          </button>
          <button
            className="ctrl-btn"
            onClick={() => {
              localStorage.removeItem("admin_token");
              setToken("");
              setData(null);
            }}
            title="Выйти"
          >
            <Icon name="LogOut" size={14} />
          </button>
        </div>
      </header>

      <main className="dash-main">
        {error && (
          <div className="error-bar animate-fade-in">
            <Icon name="AlertCircle" size={16} />
            {error}
          </div>
        )}

        {!data && !loading && !error && (
          <div className="empty-state animate-fade-in-up">
            <Icon name="Database" size={48} />
            <p>Нажмите «Обновить» чтобы загрузить данные</p>
            <button className="ctrl-btn primary" onClick={() => fetchData()}>
              <Icon name="RotateCcw" size={14} /> Загрузить
            </button>
          </div>
        )}

        {loading && !data && (
          <div className="empty-state animate-fade-in">
            <Icon name="Loader" size={40} />
            <p>Подключение к базе данных...</p>
          </div>
        )}

        {data && (
          <div className="animate-fade-in-up">
            <div className="stats-grid">
              <Stat label="Версия PostgreSQL" value={`PG ${pgShort}`} sub={data.connection.dbname} />
              <Stat label="Размер БД" value={data.db_size} sub={`${data.tables.length} таблиц`} />
              <Stat label="Соединений" value={data.active_connections} sub="активных" />
              <Stat
                label="Кэш-хит"
                value={`${cacheRatio}%`}
                sub={cacheRatio >= 95 ? "отлично" : cacheRatio >= 80 ? "хорошо" : "низкий"}
              />
              <Stat label="Коммитов" value={formatNumber(data.db_stats.commits)} sub="всего" />
              <Stat label="Откатов" value={formatNumber(data.db_stats.rollbacks)} sub="транзакций" />
            </div>

            <section className="section">
              <div className="section-header">
                <Icon name="Plug" size={16} />
                <h2>Параметры подключения</h2>
              </div>
              <div className="conn-grid">
                {Object.entries(data.connection).map(([k, v]) => (
                  <div key={k} className="conn-item">
                    <span className="conn-key">{k}</span>
                    <span className="conn-val">{v}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="section">
              <div className="section-header">
                <Icon name="Zap" size={16} />
                <h2>Буферный кэш</h2>
                <span className="section-badge">{cacheRatio}%</span>
              </div>
              <div className="cache-bar-wrap">
                <div
                  className={`cache-bar ${cacheRatio >= 95 ? "good" : cacheRatio >= 80 ? "ok" : "bad"}`}
                  style={{ width: `${cacheRatio}%` }}
                />
              </div>
              <div className="cache-meta">
                <span>Блоков из кэша: {formatNumber(data.db_stats.blocks_hit)}</span>
                <span>Блоков с диска: {formatNumber(data.db_stats.blocks_read)}</span>
              </div>
            </section>

            {Object.keys(data.connections_by_state).length > 0 && (
              <section className="section">
                <div className="section-header">
                  <Icon name="Activity" size={16} />
                  <h2>Соединения по состоянию</h2>
                </div>
                <div className="state-grid">
                  {Object.entries(data.connections_by_state).map(([state, cnt]) => (
                    <div key={state} className="state-item">
                      <span className={`state-dot ${state === "active" ? "active" : state === "idle" ? "idle" : "other"}`} />
                      <span className="state-name">{state}</span>
                      <span className="state-cnt">{cnt}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {data.tables.length > 0 && (
              <section className="section">
                <div className="section-header">
                  <Icon name="Table" size={16} />
                  <h2>Таблицы</h2>
                  <span className="section-badge">{data.tables.length}</span>
                </div>
                <div className="table-wrap">
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>Таблица</th>
                        <th>Схема</th>
                        <th>Размер</th>
                        <th>Строк (оценка)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tables.map(t => (
                        <tr key={`${t.schema}.${t.name}`}>
                          <td className="tbl-name">{t.name}</td>
                          <td className="tbl-schema">{t.schema}</td>
                          <td>{t.size}</td>
                          <td>{formatNumber(t.rows)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <div className="server-time">
              Серверное время БД: {data.server_time.split(".")[0].replace("T", " ")}
            </div>
          </div>
        )}
      </main>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .dashboard {
    min-height: 100vh;
    background: #0d0d0f;
    color: #e8e8ea;
    font-family: "IBM Plex Sans", sans-serif;
  }

  .auth-screen {
    min-height: 100vh;
    background: #0d0d0f;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .auth-box {
    background: #141416;
    border: 1px solid #2a2a2e;
    padding: 48px;
    width: 380px;
    text-align: center;
  }
  .auth-logo {
    color: #c8a96e;
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
  }
  .auth-box h1 {
    font-family: "Oswald", sans-serif;
    font-size: 1.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 12px;
    color: #e8e8ea;
  }
  .auth-box p {
    color: #6b6b72;
    font-size: 0.85rem;
    margin-bottom: 32px;
    line-height: 1.6;
  }
  .auth-form { display: flex; flex-direction: column; gap: 12px; }
  .auth-input {
    background: #1c1c1f;
    border: 1px solid #2a2a2e;
    color: #e8e8ea;
    padding: 12px 16px;
    font-family: "IBM Plex Sans", monospace;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s;
    width: 100%;
    box-sizing: border-box;
  }
  .auth-input:focus { border-color: #c8a96e; }
  .auth-btn {
    background: #c8a96e;
    color: #0d0d0f;
    border: none;
    padding: 12px;
    font-family: "Oswald", sans-serif;
    font-size: 1rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .auth-btn:hover { opacity: 0.85; }

  .dash-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    height: 56px;
    background: #141416;
    border-bottom: 1px solid #2a2a2e;
    position: sticky;
    top: 0;
    z-index: 10;
    flex-wrap: wrap;
    gap: 8px;
  }
  .dash-header-left { display: flex; align-items: center; gap: 12px; }
  .dash-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .dash-logo { color: #c8a96e; display: flex; }
  .dash-title {
    font-family: "Oswald", sans-serif;
    font-size: 1rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #e8e8ea;
  }
  .dash-badge {
    display: flex; align-items: center; gap: 5px;
    font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 2px 8px; border: 1px solid;
  }
  .dash-badge.ok { color: #4ade80; border-color: #4ade8033; background: #4ade8008; }
  .dash-badge.err { color: #f87171; border-color: #f8717133; background: #f8717108; }
  .dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: currentColor;
    animation: dpulse 2s infinite;
  }
  @keyframes dpulse { 0%,100%{opacity:1} 50%{opacity:.4} }

  .last-update { font-size: 0.75rem; color: #6b6b72; }
  .ctrl-btn {
    display: flex; align-items: center; gap: 6px;
    background: #1c1c1f; border: 1px solid #2a2a2e;
    color: #e8e8ea; padding: 6px 12px;
    font-family: "IBM Plex Sans", sans-serif; font-size: 0.78rem;
    cursor: pointer; transition: all 0.2s; white-space: nowrap;
  }
  .ctrl-btn:hover { border-color: #c8a96e; color: #c8a96e; }
  .ctrl-btn.active { border-color: #c8a96e; color: #c8a96e; background: #c8a96e0f; }
  .ctrl-btn.primary { background: #c8a96e; color: #0d0d0f; border-color: #c8a96e; }
  .ctrl-btn.primary:hover { opacity: 0.85; color: #0d0d0f; }
  .ctrl-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .dash-main { padding: 24px; max-width: 1200px; margin: 0 auto; }

  .error-bar {
    display: flex; align-items: center; gap: 8px;
    background: #f8717110; border: 1px solid #f8717133;
    color: #f87171; padding: 12px 16px; margin-bottom: 20px;
    font-size: 0.85rem;
  }

  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    gap: 16px; padding: 80px 0; color: #6b6b72; text-align: center;
  }
  .empty-state p { font-size: 0.9rem; }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1px;
    background: #2a2a2e;
    border: 1px solid #2a2a2e;
    margin-bottom: 16px;
  }
  .stat-card {
    background: #141416;
    padding: 20px;
    display: flex; flex-direction: column; gap: 4px;
  }
  .stat-label { font-size: 0.72rem; color: #6b6b72; text-transform: uppercase; letter-spacing: 0.08em; }
  .stat-value { font-family: "Oswald", sans-serif; font-size: 1.6rem; color: #e8e8ea; }
  .stat-sub { font-size: 0.75rem; color: #6b6b72; }

  .section {
    background: #141416;
    border: 1px solid #2a2a2e;
    margin-bottom: 16px;
  }
  .section-header {
    display: flex; align-items: center; gap: 8px;
    padding: 14px 20px;
    border-bottom: 1px solid #2a2a2e;
    color: #6b6b72;
  }
  .section-header h2 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 0.8rem; font-weight: 500;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: #e8e8ea; margin: 0;
  }
  .section-badge {
    margin-left: auto;
    font-size: 0.75rem; color: #c8a96e;
    font-family: "IBM Plex Sans", monospace;
  }

  .conn-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
  .conn-item {
    padding: 14px 20px;
    border-right: 1px solid #2a2a2e;
    border-bottom: 1px solid #2a2a2e;
  }
  .conn-key { display: block; font-size: 0.7rem; color: #6b6b72; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
  .conn-val { font-family: "IBM Plex Sans", monospace; font-size: 0.85rem; color: #e8e8ea; }

  .cache-bar-wrap {
    margin: 16px 20px 12px;
    height: 6px;
    background: #1c1c1f;
    overflow: hidden;
  }
  .cache-bar { height: 100%; transition: width 0.8s ease; }
  .cache-bar.good { background: #4ade80; }
  .cache-bar.ok { background: #fbbf24; }
  .cache-bar.bad { background: #f87171; }
  .cache-meta {
    display: flex; justify-content: space-between;
    padding: 0 20px 16px;
    font-size: 0.75rem; color: #6b6b72;
  }

  .state-grid { display: flex; flex-wrap: wrap; }
  .state-item {
    display: flex; align-items: center; gap: 8px;
    padding: 14px 20px;
    border-right: 1px solid #2a2a2e;
    font-size: 0.85rem;
  }
  .state-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .state-dot.active { background: #4ade80; }
  .state-dot.idle { background: #6b6b72; }
  .state-dot.other { background: #fbbf24; }
  .state-name { color: #6b6b72; font-size: 0.78rem; }
  .state-cnt { font-family: "Oswald", sans-serif; font-size: 1.1rem; margin-left: 4px; color: #e8e8ea; }

  .table-wrap { overflow-x: auto; }
  .db-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .db-table th {
    text-align: left; padding: 10px 20px;
    font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.07em;
    color: #6b6b72; font-weight: 400;
    border-bottom: 1px solid #2a2a2e;
  }
  .db-table td { padding: 11px 20px; border-bottom: 1px solid #2a2a2e; color: #e8e8ea; }
  .db-table tr:last-child td { border-bottom: none; }
  .db-table tr:hover td { background: #1c1c1f; }
  .tbl-name { font-family: "IBM Plex Sans", monospace; font-weight: 500; }
  .tbl-schema { color: #6b6b72; font-size: 0.75rem; }

  .server-time {
    text-align: right; font-size: 0.72rem; color: #6b6b72;
    padding: 12px 0; letter-spacing: 0.04em;
  }
`;
