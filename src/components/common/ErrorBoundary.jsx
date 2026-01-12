// src/components/common/ErrorBoundary/ErrorBoundary.jsx
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error){
    return { hasError: true, error };
  }
  componentDidCatch(err, info){
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary]", err, info);
    }
  }
  render(){
    if (this.state.hasError){
      return (
        <div style={{
          padding: 16, border: "1px solid #FCA5A5", background: "#FEF2F2",
          color: "#991B1B", borderRadius: 12
        }}>
          <strong>Grafik gagal dimuat.</strong>
          <div style={{ opacity:.8, marginTop: 6, fontSize: 13 }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
          <button
            onClick={() => this.setState({ hasError:false, error:null })}
            style={{
              marginTop: 10, padding:"8px 12px", borderRadius:8,
              border:"1px solid #DC2626", background:"#FFF", cursor:"pointer"
            }}
          >
            Coba render ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
