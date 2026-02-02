import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";



const VMShellPage = () => {
    const termRef = useRef(null);
    const terminalRef = useRef(null);
    const params = new URLSearchParams(window.location.search);
    const [currentTheme, setCurrentTheme] = useState("midnight");
    const isLight = currentTheme === "light";

    // Use the same TERMINAL_THEMES object from your K8s code here
    const TERMINAL_THEMES = {
  tokyoNight: {
    background: "#1a1b26",
    foreground: "#a9b1d6",
    cursor: "#f7768e",
    selectionBackground: "rgba(122, 162, 247, 0.3)",
    black: "#32344a", red: "#f7768e", green: "#9ece6a", yellow: "#e0af68",
    blue: "#7aa2f7", magenta: "#bb9af7", cyan: "#7dcfff", white: "#a9b1d6",
  },
  hacker: {
    background: "#0a0a0a",
    foreground: "#00ff00",
    cursor: "#00ff00",
    selectionBackground: "rgba(0, 255, 0, 0.2)",
    black: "#000000", red: "#ff0000", green: "#00ff00", yellow: "#ffff00",
    blue: "#0000ff", magenta: "#ff00ff", cyan: "#00ffff", white: "#ffffff",
  },
  midnight: {
    background: "#0f111a",
    foreground: "#d0d0d0",
    cursor: "#ffcb6b",
    selectionBackground: "rgba(255, 255, 255, 0.1)",
    black: "#000000", red: "#ff5572", green: "#c3e88d", yellow: "#ffcb6b",
    blue: "#82aaff", magenta: "#c792ea", cyan: "#89ddff", white: "#d0d0d0",
  },
  light: {
    background: "#ffffff",
    foreground: "#2e3440", // Deep charcoal for readability
    cursor: "#5e81ac",
    selectionBackground: "rgba(0, 0, 0, 0.1)",
    black: "#3b4252",
    red: "#bf616a",    // Darker red
    green: "#434c5e",  // Darker green
    yellow: "#d08770", // Darker orange/yellow
    blue: "#5e81ac",
    magenta: "#b48ead",
    cyan: "#88c0d0",
    white: "#e5e9f0",
  }
};

useEffect(() => {
    if (terminalRef.current) {
        terminalRef.current.options.theme = TERMINAL_THEMES[currentTheme];
    }
}, [currentTheme]);

    useEffect(() => {
        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "'Fira Code', monospace",
            theme: TERMINAL_THEMES[currentTheme],
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(termRef.current);
        fitAddon.fit();
        terminalRef.current = term;

        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const ws = new WebSocket(`${protocol}://${window.location.hostname}:8000/ws/vm/exec/`);

        ws.onopen = () => {
            ws.send(JSON.stringify({
                ip_address: params.get("ip"),
                user: params.get("user") || "ubuntu",
                cols: term.cols,
                rows: term.rows
            }));
        };

        ws.onmessage = (e) => term.write(e.data);
        term.onData((data) => ws.readyState === 1 && ws.send(data));

        const handleResize = () => {
            fitAddon.fit();
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
            }
        };
        window.addEventListener("resize", handleResize);

        return () => {
            ws.close();
            term.dispose();
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    // Keep the same Header JSX as your PodShell for consistency
    return (
           <div style={{ 
      width: "100vw", height: "100vh", 
      background: TERMINAL_THEMES[currentTheme].background, display: "flex", flexDirection: "column", transition: "background 0.3s ease",
      overflow: "hidden" 
    }}>
      {/* Visual Header */}
      <div style={{ 
        background: isLight ? "#f0f0f0" : "#1a1c25", padding: "8px 16px", 
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: `1px solid ${isLight ? "#ccc" : "#333"}`, color: isLight ? "#333" : "#fff", fontSize: "12px",
        fontFamily: "sans-serif"
      }}>
        {/* ✅ Fixed: Changed podName to podDisplayName */}
        <div><span style={{ opacity: 0.7 }}>Meghdoot TERMINAL —</span> <b>{params.get("ip")}</b>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {/* Theme Toggle Select */}
        <select 
          value={currentTheme} 
          onChange={(e) => setCurrentTheme(e.target.value)}
          style={{
            background: isLight ? "#fff" : "#282a36", 
            color: isLight ? "#333" : "#fff", 
            border: `1px solid ${isLight ? "#ccc" : "#444"}`,
            borderRadius: "4px", 
            fontSize: "11px", 
            padding: "2px 8px", 
            cursor: "pointer",
            outline: "none"
          }}
        >
          <option value="midnight">Midnight Blue</option>
          <option value="tokyoNight">Tokyo Night</option>
          <option value="hacker">Matrix Green</option>
          <option value="light">Daylight White</option>
        </select>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5572" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffcb6b" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#c3e88d" }} />
        </div>
      </div>

      <div style={{ flex: 1, padding: "10px" }}>
        <div ref={termRef} style={{ width: "100%", height: "100%" }} />
      </div>

      <style>{`
        .xterm-viewport::-webkit-scrollbar { width: 8px; }
        .xterm-viewport::-webkit-scrollbar-track { background: ${TERMINAL_THEMES[currentTheme].background}; }
        .xterm-viewport::-webkit-scrollbar-thumb { background: ${isLight ? "#ccc" : "#282a36"}; 
           border-radius: 4px; }
        .xterm-viewport::-webkit-scrollbar-thumb:hover { background: #3b3f51; }
      `}</style>
    </div>
    );
};

export default VMShellPage;