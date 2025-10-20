// src/pages/SchoolDetail/SdDetailRoute.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SchoolDetailSd from '@/components/schools/SchoolDetail/Sd/SchoolDetailSd';
import { getSdDetailByNpsn } from '@/services/api/detailApi';

function qp(name){
  const v = new URLSearchParams(window.location.search).get(name);
  return v && String(v).trim() !== '' ? v : null;
}

export default function SdDetailRoute(){
  const navigate = useNavigate();
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);
  const [schoolData,setSchoolData] = useState(null);
  const npsn = useMemo(()=>qp('npsn'),[]);

  const handleBack = useCallback(()=>{
    if (window.history.length > 1) window.history.back();
    else navigate('/detail-sekolah');
  },[navigate]);

  useEffect(()=>{
    let alive = true;
    (async ()=>{
      try{
        if(!npsn) throw new Error('Parameter ?npsn=... tidak ditemukan');
        const row = await getSdDetailByNpsn(npsn);
        if(!alive) return;
        if(!row) throw new Error('Detail sekolah tidak ditemukan.');
        setSchoolData(row);
      }catch(e){
        if(!alive) return;
        setError(e?.message || String(e));
      }finally{
        if(alive) setLoading(false);
      }
    })();
    return ()=>{ alive = false; };
  },[npsn]);

  if(loading) return <div style={{padding:16}}><button onClick={handleBack} style={{marginBottom:12}}>← Kembali</button>Memuat data…</div>;
  if(error)   return <div style={{padding:16}}><button onClick={handleBack} style={{marginBottom:12}}>← Kembali</button><div style={{color:'crimson'}}>{error}</div></div>;

  return <SchoolDetailSd schoolData={schoolData} onBack={handleBack} />;
}
