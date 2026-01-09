import { useState } from 'react';
import { ragApi } from '../lib/api';
import { Upload, Search, FileText } from 'lucide-react';

export default function RagPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await ragApi.search(searchQuery);
      setSearchResults(response.data.results);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadName.trim()) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        const format = uploadFile.name.split('.').pop() || 'txt';

        await ragApi.uploadDocument({
          name: uploadName,
          content: base64,
          format,
        });

        alert('Document uploaded successfully!');
        setUploadName('');
        setUploadFile(null);
      };
      reader.readAsDataURL(uploadFile);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>RAG Documents</h1>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            <Search size={24} />
            Search Documents
          </h2>
          <form onSubmit={handleSearch} style={styles.form}>
            <input
              type="text"
              placeholder="What are you looking for?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.input}
            />
            <button
              type="submit"
              style={styles.button}
              disabled={searching}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div style={styles.results}>
              <h3 style={styles.resultsTitle}>
                {searchResults.length} results
              </h3>
              {searchResults.map((result, idx) => (
                <div key={idx} style={styles.resultCard}>
                  <div style={styles.resultHeader}>
                    <FileText size={16} />
                    <span style={styles.resultScore}>
                      Score: {(result.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p style={styles.resultText}>{result.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            <Upload size={24} />
            Upload Document
          </h2>
          <form onSubmit={handleUpload} style={styles.form}>
            <input
              type="text"
              placeholder="Document name"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              style={styles.fileInput}
              required
            />
            <button
              type="submit"
              style={styles.button}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '32px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  },
  card: {
    background: '#16181c',
    border: '1px solid #2f3336',
    borderRadius: '12px',
    padding: '24px',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    padding: '12px 16px',
    background: '#0f1419',
    border: '1px solid #2f3336',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
  },
  fileInput: {
    padding: '12px 16px',
    background: '#0f1419',
    border: '1px solid #2f3336',
    borderRadius: '8px',
    fontSize: '15px',
  },
  button: {
    padding: '12px',
    background: '#1d9bf0',
    color: 'white',
    borderRadius: '8px',
    fontWeight: '600',
  },
  results: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #2f3336',
  },
  resultsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#8b98a5',
  },
  resultCard: {
    background: '#0f1419',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  resultScore: {
    fontSize: '13px',
    color: '#1d9bf0',
    fontWeight: '600',
  },
  resultText: {
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#e7e9ea',
  },
};
