import { useEffect, useRef, useState } from 'react'
import './App.css'

const SCRIPT_SRC = 'https://components.connect.trimble.com/trimble-connect-workspace-api/index.js'

function App() {
  const iframeRef = useRef(null)
  const [env, setEnv] = useState('stage')
  const [accessToken, setAccessToken] = useState('')
  const [refreshToken, setRefreshToken] = useState('')
  const [shareToken, setShareToken] = useState('')
  const [projectId, setProjectId] = useState('')
  const [manifestId, setManifestId] = useState('')
  const [embedURL, setEmbedURL] = useState('')
  const [projectName, setProjectName] = useState('')
  const [userName, setUserName] = useState('')
  const [selection, setSelection] = useState('None')
  const [status, setStatus] = useState('Waiting for a viewer load.')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scriptReady, setScriptReady] = useState(Boolean(window.TrimbleConnectWorkspace))

  useEffect(() => {
    const existing = document.getElementById('trimble-workspace-api-script')

    if (existing) {
      if (window.TrimbleConnectWorkspace) {
        setScriptReady(true)
      }
      return
    }

    const script = document.createElement('script')
    script.id = 'trimble-workspace-api-script'
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => setScriptReady(true)
    script.onerror = () => {
      setError('Unable to load the Trimble Workspace API script.')
      setScriptReady(false)
    }

    document.body.appendChild(script)
  }, [])

  const handleLoadViewer = async () => {
    if (!window.TrimbleConnectWorkspace) {
      setError('Trimble Workspace API has not finished loading yet.')
      return
    }

    if (!accessToken && !shareToken) {
      setError('Enter an accessToken or a shareToken before loading the viewer.')
      return
    }

    setError('')
    setLoading(true)

    const iframe = iframeRef.current
    const url = embedURL || `${window.location.origin}?isEmbedded=true&env=${env}`

    iframe.src = url
    iframe.hidden = false
    iframe.onload = async () => {
      try {
        const api = await window.TrimbleConnectWorkspace.connect(
          iframe,
          (event, args) => {
            if (event === 'viewer.onSelectionChanged') {
              const ids = args?.data ?? []
              setSelection(Array.isArray(ids) && ids.length ? ids.join(', ') : 'None')
            }

            if (event === 'project.onChanged') {
              const project = args?.data?.new
              setProjectName(project?.name ?? 'Project loaded')
            }
          },
          60000,
        )

        await api.embed.setTokens({ accessToken, refreshToken, shareToken })

        const viewerConfig = {
          projectId: projectId || 'undefined',
          ...(manifestId ? { manifestId } : {}),
        }

        await api.embed.init3DViewer(viewerConfig)

        const project = await api.project.getProject()
        const user = await api.user.getUser()

        setProjectName(project?.name ?? (projectId || 'Project loaded'))
        setUserName(user?.name ?? user?.displayName ?? 'User loaded')
        setStatus('Viewer connected successfully.')
      } catch (loadError) {
        setError(loadError?.message || 'Failed to connect the viewer.')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="extension-page">
      <div className="extension-shell">
        <h1>Trimble Connect 3D Viewer - Workspace API Example</h1>

        <div className="form-grid">
          <label>
            <span>Environment</span>
            <select value={env} onChange={(event) => setEnv(event.target.value)}>
              <option value="prod">prod</option>
              <option value="int">int</option>
              <option value="qa">qa</option>
              <option value="stage">stage</option>
            </select>
          </label>

          <label className="wide">
            <span>Embed URL (optional)</span>
            <input
              type="text"
              value={embedURL}
              onChange={(event) => setEmbedURL(event.target.value)}
              placeholder="Enter embed URL as iframe src"
            />
          </label>

          <label className="wide">
            <span>Access Token</span>
            <input
              type="text"
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              placeholder="Enter AccessToken"
            />
          </label>

          <label className="wide">
            <span>Refresh Token</span>
            <input
              type="text"
              value={refreshToken}
              onChange={(event) => setRefreshToken(event.target.value)}
              placeholder="Enter RefreshToken"
            />
          </label>

          <label className="wide">
            <span>Share Token</span>
            <input
              type="text"
              value={shareToken}
              onChange={(event) => setShareToken(event.target.value)}
              placeholder="Enter ShareToken"
            />
          </label>

          <label className="wide">
            <span>Project ID</span>
            <input
              type="text"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              placeholder="Enter ProjectId"
            />
          </label>

          <label className="wide">
            <span>Manifest ID (Viewer)</span>
            <input
              type="text"
              value={manifestId}
              onChange={(event) => setManifestId(event.target.value)}
              placeholder="Enter ManifestId"
            />
          </label>
        </div>

        <div className="toolbar">
          <button type="button" onClick={handleLoadViewer} disabled={!scriptReady || loading}>
            {loading ? 'Loading...' : 'Load 3DViewer'}
          </button>
        </div>

        {error ? <div className="message error">{error}</div> : null}
        {status ? <div className="message info">{status}</div> : null}

        <div className="viewer-panel">
          <div className="meta-grid">
            <div className="meta-card">
              <h2>Project</h2>
              <p>Name: {projectName || 'Not loaded'}</p>
              <p>ID: {projectId || 'Not set'}</p>
            </div>

            <div className="meta-card">
              <h2>User</h2>
              <p>{userName || 'Not loaded'}</p>
            </div>

            <div className="meta-card">
              <h2>Selection</h2>
              <p>{selection}</p>
            </div>
          </div>

          <iframe
            ref={iframeRef}
            title="Trimble Connect Viewer"
            sandbox="allow-scripts allow-modals allow-forms allow-same-origin allow-popups"
            hidden
            className="viewer-frame"
          />
        </div>
      </div>
    </div>
  )
}

export default App
