import { Link, useParams } from 'react-router-dom'
import { getProject } from '../data/projects.js'
import NotFound from './NotFound.jsx'

export default function Project() {
  const { slug } = useParams()
  const project = getProject(slug)

  if (!project) {
    return <NotFound />
  }

  return (
    <article className="project">
      <p className="eyebrow">
        <Link to="/">Work</Link> / {project.title}
      </p>
      <h1>{project.title}</h1>
      <ul className="tags">
        {project.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
      <div
        className="hero-visual"
        style={{ '--accent': project.accent }}
        aria-hidden="true"
      />
      <p className="lede">{project.summary}</p>
      <div className="actions">
        {project.playUrl ? (
          <a className="btn" href={project.playUrl}>
            Play now
          </a>
        ) : null}
        {project.liveUrl ? (
          <a className="btn" href={project.liveUrl} target="_blank" rel="noreferrer">
            Open live designer
          </a>
        ) : project.liveLabel ? (
          <span className="btn btn-disabled">{project.liveLabel}</span>
        ) : null}
      </div>
      <h2>The problem</h2>
      <p>{project.problem}</p>
      <h2>How it works</h2>
      {project.how.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <h2>Stack</h2>
      <p>{project.stack}</p>
    </article>
  )
}
