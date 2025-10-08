import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error){ return { hasError: true, error }; }
  componentDidCatch(err, info){ console.error('[ErrorBoundary]', err, info); }
  render(){
    if (this.state.hasError){
      return (
        <div style={{ padding: 24 }}>
          <h2>Terjadi kesalahan saat merender.</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error?.message || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
