import React from 'react';
import Map from '../Map/Map';
import SchoolDetailPage from './SchoolDetailPage';

const DetailSekolahWrapper = () => {
  return (
    <div>
      <section>
        <Map />
      </section>
      <section>
        <SchoolDetailPage />
      </section>
    </div>
  );
};

export default DetailSekolahWrapper;
