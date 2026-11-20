import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import "./PickerPage.css";

const TARGET_SECONDS = 120;

function formatTime(total) {
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function PickerPage() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(null);
  const [pickers, setPickers] = useState([]);
  const [pickerId, setPickerId] = useState(null);
  const [queue, setQueue] = useState([]);
  const [active, setActive] = useState(null); // the order being picked
  const [result, setResult] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .darkStores()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.stores ?? []);
        setStores(list);
        if (list.length > 0) setStoreId(list[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  const loadQueue = useCallback(() => {
    if (storeId === null) return;
    api.pickerQueue(storeId).then(setQueue).catch((err) => setError(err.message));
  }, [storeId]);

  useEffect(() => {
    if (storeId === null) return;
    setActive(null);
    setResult(null);
    api
      .pickers(storeId)
      .then((list) => {
        setPickers(list);
        setPickerId(list.find((p) => p.active)?.id ?? null);
      })
      .catch((err) => setError(err.message));
    loadQueue();
  }, [storeId, loadQueue]);

  const startedAt = active?.startedAt;
  useEffect(() => {
    if (!startedAt) return undefined;
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const claim = async (order) => {
    setError("");
    setResult(null);
    try {
      const task = await api.claimOrder(order.id, pickerId);
      setActive({
        orderId: order.id,
        startedAt: task.startedAt,
        lines: order.items.map((l) => ({
          productId: l.productId,
          name: l.name,
          required: l.quantity,
          scanned: 0
        })),
        complete: false
      });
      loadQueue();
    } catch (err) {
      setError(err.message);
    }
  };

  const scan = async (productId) => {
    setError("");
    try {
      const progress = await api.scanItem(active.orderId, productId);
      setActive((prev) => ({ ...prev, lines: progress.lines, complete: progress.complete }));
    } catch (err) {
      setError(err.message);
    }
  };

  const pack = async () => {
    setError("");
    try {
      const task = await api.packOrder(active.orderId);
      setResult({
        orderId: task.orderId,
        seconds: task.pickDurationSeconds,
        withinTarget: task.withinTarget
      });
      setActive(null);
      loadQueue();
    } catch (err) {
      setError(err.message);
    }
  };

  const done = active ? active.lines.reduce((sum, l) => sum + l.scanned, 0) : 0;
  const total = active ? active.lines.reduce((sum, l) => sum + l.required, 0) : 0;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <main className="main picker-page">
      <h1>📦 Picker app</h1>
      <p className="picker-hint">Pick and pack each order in under 2 minutes.</p>

      <div className="picker-controls">
        <label>
          Dark store
          <select
            value={storeId ?? ""}
            onChange={(e) => setStoreId(Number(e.target.value))}
            disabled={active !== null}
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Picker
          <select
            value={pickerId ?? ""}
            onChange={(e) => setPickerId(Number(e.target.value))}
            disabled={active !== null}
          >
            {pickers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="picker-error">⚠️ {error}</p>}

      {result && (
        <p className={result.withinTarget ? "picker-result ok" : "picker-result late"}>
          Order #{result.orderId} packed in {formatTime(result.seconds)}{" "}
          {result.withinTarget ? "✅ within the 2-minute target" : "⏱️ over the 2-minute target"}
        </p>
      )}

      {active ? (
        <section className="picker-card">
          <header className="picker-card-head">
            <h2>Order #{active.orderId}</h2>
            <span className={elapsed > TARGET_SECONDS ? "picker-timer over" : "picker-timer"}>
              ⏱ {formatTime(elapsed)}
            </span>
          </header>

          <div className="picker-progress" aria-label="Scan progress">
            <div className="picker-progress-bar" style={{ width: `${percent}%` }} />
          </div>
          <p className="picker-hint">
            {done} / {total} items scanned
          </p>

          <ul className="picker-lines">
            {active.lines.map((line) => (
              <li key={line.productId}>
                <span>
                  {line.name} <strong>{line.scanned} / {line.required}</strong>
                </span>
                <button
                  className="chip"
                  onClick={() => scan(line.productId)}
                  disabled={line.scanned >= line.required}
                >
                  Scan
                </button>
              </li>
            ))}
          </ul>

          <button className="chip active picker-pack" onClick={pack} disabled={!active.complete}>
            Mark packed
          </button>
        </section>
      ) : (
        <section className="picker-card">
          <h2>Orders to pick ({queue.length})</h2>
          {queue.length === 0 ? (
            <p className="picker-hint">No order waiting. Place one in the Shop tab.</p>
          ) : (
            <ul className="picker-lines">
              {queue.map((order) => (
                <li key={order.id}>
                  <span>
                    Order #{order.id} · {order.items.reduce((sum, l) => sum + l.quantity, 0)} items · €
                    {order.total.toFixed(2)}
                  </span>
                  <button className="chip active" onClick={() => claim(order)} disabled={pickerId === null}>
                    Claim
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}