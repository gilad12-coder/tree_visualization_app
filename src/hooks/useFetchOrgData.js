import { useState, useEffect } from 'react';
import axios from 'axios';

const useFetchOrgData = (url) => {
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        const response = await axios.get(url);
        setOrgData(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch organizational data');
        setLoading(false);
      }
    };

    fetchOrgData();
  }, [url]);

  return { orgData, loading, error };
};

export default useFetchOrgData;
