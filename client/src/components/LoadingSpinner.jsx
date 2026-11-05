import './LoadingSpinner.css'

function LoadingSpinner({ fullScreen = false, size = 'md', text = '' }) {
  const sizeMap = {
    sm: 24,
    md: 40,
    lg: 56,
  }

  const spinnerSize = sizeMap[size] || sizeMap.md

  if (fullScreen) {
    return (
      <div className="spinner-fullscreen">
        <div className="spinner-container">
          <div
            className="spinner"
            style={{ width: spinnerSize, height: spinnerSize }}
          />
          {text && <p className="spinner-text">{text}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="spinner-inline">
      <div
        className="spinner"
        style={{ width: spinnerSize, height: spinnerSize }}
      />
      {text && <p className="spinner-text">{text}</p>}
    </div>
  )
}

export default LoadingSpinner
