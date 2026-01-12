import React from 'react';

export default function LayoutFrame({ map, side }) {
  return (
    <div className="u-container">
      <div className="u-grid u-gap-6 u-grid-7-5">
        <section>{map}</section>
        <aside>{side}</aside>
      </div>
    </div>
  );
}
