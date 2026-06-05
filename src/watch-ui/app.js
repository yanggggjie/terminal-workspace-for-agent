window.ttaWatch = (function () {
  let term = null;
  let ws = null;
  let activeSession = null;
  const POLL_MS = 2000;

  function setStatus(text) {
    document.getElementById("status").textContent = text;
  }

  function markActiveTab(sessionName) {
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.session === sessionName);
    });
  }

  function renderTabs(sessions) {
    const container = document.getElementById("tabs");
    if (!container) return;

    if (sessions.length === 0) {
      container.innerHTML =
        '<p class="empty">No sessions. Start one with <code>tta sess start --sess=&lt;name&gt; --cmd="…"</code>.</p>';
      return;
    }

    const nav = document.createElement("nav");
    nav.className = "tabs";

    for (const s of sessions) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab";
      if (s.status === "exited") btn.classList.add("exited");
      if (s.session_name === activeSession) btn.classList.add("active");
      btn.dataset.session = s.session_name;
      btn.textContent =
        s.status === "exited" ? `${s.session_name} (exited)` : s.session_name;
      nav.appendChild(btn);
    }

    container.replaceChildren(nav);
  }

  async function refreshTabs() {
    try {
      const res = await fetch("/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "list" }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.type !== "list") return;
      renderTabs(data.sessions || []);

      if (activeSession) {
        markActiveTab(activeSession);
        return;
      }
      const first = document.querySelector(".tab");
      if (first) connect(first.dataset.session);
    } catch {
      /* ignore poll errors */
    }
  }

  const WATCH_ROWS = 42;

  function initTerminal(cols, rows) {
    const container = document.getElementById("terminal");
    container.innerHTML = "";
    const termCols = cols || 120;
    const termRows = Math.max(rows || 30, WATCH_ROWS);
    term = new Terminal({
      disableStdin: true,
      convertEol: true,
      cols: termCols,
      rows: termRows,
      scrollback: 10000,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, "Cascadia Mono", monospace',
      fontSize: 13,
      lineHeight: 1.05,
      theme: {
        background: "#1a1a1e",
        foreground: "#d4d4d4",
        cursor: "#4a9eff",
        selectionBackground: "rgba(74, 158, 255, 0.35)",
      },
    });
    term.open(container);
  }

  function connect(sessionName) {
    if (!sessionName) return;
    if (activeSession === sessionName && ws && ws.readyState <= WebSocket.OPEN) {
      markActiveTab(sessionName);
      return;
    }

    if (ws) {
      ws.close();
      ws = null;
    }

    activeSession = sessionName;
    markActiveTab(sessionName);
    setStatus(`Connecting to ${sessionName}…`);

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    ws = new WebSocket(`${proto}//${location.host}/ws/${sessionName}`);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "init":
          initTerminal(msg.cols, msg.rows);
          if (msg.replay) term.write(msg.replay);
          setStatus(sessionName);
          break;
        case "data":
          if (term) term.write(msg.data);
          break;
        case "end":
          setStatus(`${sessionName} disconnected`);
          break;
        case "error":
          setStatus(`Error: ${msg.message}`);
          break;
      }
    };

    ws.onclose = () => {
      if (activeSession === sessionName) {
        setStatus(`${sessionName} disconnected`);
      }
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("tabs")?.addEventListener("click", (event) => {
      const btn = event.target.closest(".tab");
      if (!btn) return;
      event.preventDefault();
      connect(btn.dataset.session);
    });
    refreshTabs();
    setInterval(refreshTabs, POLL_MS);
  });

  return { refreshTabs, connect };
})();
