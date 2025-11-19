import { useState } from 'react';

const API_URL = 'http://localhost:3000';

export default function CVOptimizer() {
  const [cvFile, setCvFile] = useState(null);
  const [jobListing, setJobListing] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [pdfFilename, setPdfFilename] = useState('');

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };

  const analyzeCV = async () => {
    if (!cvFile) return alert('Please upload a CV file');
    if (!jobListing) return alert('Please enter a job description');

    const formData = new FormData();
    formData.append('cv', cvFile);
    formData.append('job', jobListing);

    setLoading(true);
    setResults(null);
    setPdfFilename('');

    try {
      const response = await fetch(`${API_URL}/api/optimize`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Server returned an error');

      const data = await response.json();
      setResults(data.frontendContent);
      setPdfFilename(data.filename);
    } catch (err) {
      console.error(err);
      alert('Error processing CV. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfFilename) return;
    window.open(`${API_URL}/api/download/${pdfFilename}`, '_blank');
  };

  // =====================
  // DESIGN
  // =====================

  const containerStyle = {
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(135deg, #6a11cb, #2575fc)',
    padding: '60px 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '1100px',
    background: '#ffffff',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
    minHeight: '600px',
  };

  const titleStyle = {
    textAlign: 'center',
    marginBottom: '40px',
    fontSize: '34px',
    fontWeight: '700',
    color: '#333',
  };

  const labelStyle = {
    fontWeight: '600',
    marginBottom: '8px',
    display: 'block',
  };

  const inputStyle = {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    borderRadius: '10px',
    border: '1px solid #ccc',
    marginBottom: '20px',
  };

  const buttonStyle = {
    padding: '15px 35px',
    backgroundColor: '#006dff',
    color: '#fff',
    fontSize: '17px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
  };

  const spinnerStyle = {
    border: '4px solid #eee',
    borderTop: '4px solid #006dff',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    animation: 'spin 1s linear infinite',
    marginLeft: '10px',
    display: 'inline-block',
  };

  const resultBox = {
    marginTop: '30px',
    padding: '20px',
    background: '#f3f6ff',
    borderRadius: '12px',
    border: '1px solid #ccd6fa',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>CV Optimizer</h2>

        <label style={labelStyle}>Upload CV (PDF):</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileUpload}
          style={inputStyle}
        />

        <label style={labelStyle}>Job Description:</label>
        <textarea
          rows="6"
          style={inputStyle}
          value={jobListing}
          onChange={(e) => setJobListing(e.target.value)}
        />

        <button style={buttonStyle} onClick={analyzeCV} disabled={loading}>
          Analyze CV
        </button>

        {loading && <span style={spinnerStyle}></span>}

        {results && (
          <div style={resultBox}>
            <h3 style={{ marginBottom: '10px' }}>Analysis Result:</h3>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '15px' }}>
              {results}
            </pre>
            <button style={{ ...buttonStyle, marginTop: '20px' }} onClick={downloadPDF}>
              Download Improved PDF
            </button>
          </div>
        )}

        <style>
          {`@keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
          }`}
        </style>
      </div>
    </div>
  );
}
