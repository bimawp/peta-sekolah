import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const Map = () => {
  const [data, setData] = useState({
    paud: [],
    sd: [],
    smp: [],
    pkbm: [],
    kecamatan: null,
    desa: null
  });
  
  const [loading, setLoading] = useState(true);
  const svgRef = useRef();

  // URLs untuk data
  const dataUrls = {
    paud: 'https://peta-sekolah.vercel.app/paud/data/paud.json',
    sd: 'https://peta-sekolah.vercel.app/sd/data/sd_new.json',
    smp: 'https://peta-sekolah.vercel.app/smp/data/smp.json',
    pkbm: 'https://peta-sekolah.vercel.app/pkbm/data/pkbm.json',
    kecamatan: 'https://peta-sekolah.vercel.app/data/kecamatan.geojson',
    desa: 'https://peta-sekolah.vercel.app/data/desa.geojson'
  };

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const promises = Object.entries(dataUrls).map(async ([key, url]) => {
          try {
            const response = await fetch(url);
            if (!response.ok) return [key, key === 'kecamatan' || key === 'desa' ? null : []];
            const data = await response.json();
            return [key, data];
          } catch (err) {
            return [key, key === 'kecamatan' || key === 'desa' ? null : []];
          }
        });

        const results = await Promise.all(promises);
        const loadedData = Object.fromEntries(results);
        setData(loadedData);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Render peta
  useEffect(() => {
    if (loading) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1000;
    const height = 700;

    svg.attr("width", width).attr("height", height);

    // Setup projection
    let projection;
    if (data.kecamatan && data.kecamatan.features) {
      projection = d3.geoMercator().fitSize([width, height], data.kecamatan);
    } else {
      // Default projection untuk Indonesia
      projection = d3.geoMercator()
        .center([110, -7.5])
        .scale(3000)
        .translate([width/2, height/2]);
    }

    const path = d3.geoPath().projection(projection);

    // Render kecamatan
    if (data.kecamatan && data.kecamatan.features) {
      svg.selectAll(".kecamatan")
        .data(data.kecamatan.features)
        .enter().append("path")
        .attr("class", "kecamatan")
        .attr("d", path)
        .attr("fill", "#f0f8ff")
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5);
    }

    // Render desa
    if (data.desa && data.desa.features) {
      svg.selectAll(".desa")
        .data(data.desa.features)
        .enter().append("path")
        .attr("class", "desa")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "#666")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.7);
    }

    // Render sekolah
    const renderSchools = (schools, color) => {
      if (!schools || schools.length === 0) return;
      
      const validSchools = schools.filter(school => 
        school && 
        typeof school.latitude === 'number' && 
        typeof school.longitude === 'number' &&
        !isNaN(school.latitude) && 
        !isNaN(school.longitude)
      );

      svg.selectAll(`.school-${color}`)
        .data(validSchools)
        .enter().append("circle")
        .attr("class", `school-${color}`)
        .attr("cx", d => {
          const coords = projection([d.longitude, d.latitude]);
          return coords ? coords[0] : null;
        })
        .attr("cy", d => {
          const coords = projection([d.longitude, d.latitude]);
          return coords ? coords[1] : null;
        })
        .attr("r", 3)
        .attr("fill", color)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("opacity", 0.8);
    };

    // Render semua jenis sekolah
    renderSchools(data.paud, '#FF6B6B');  // Merah untuk PAUD
    renderSchools(data.sd, '#4ECDC4');    // Teal untuk SD
    renderSchools(data.smp, '#45B7D1');   // Biru untuk SMP
    renderSchools(data.pkbm, '#96CEB4');  // Hijau untuk PKBM

  }, [data, loading]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading map data...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <svg 
        ref={svgRef}
        style={{ 
          width: '100%', 
          height: 'auto',
          border: '1px solid #ddd',
          display: 'block'
        }}
      />
    </div>
  );
};

export default Map;