import { Link } from 'react-router-dom'
import { projects } from '../data/projects.js'

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <p className="eyebrow">Devout of the machine gods</p>
        <h1>Software you can open in a browser.</h1>
        <p className="lede">
          The name is Matías, here I dump the stuff I do in my free time,
          software, games and 3d stuff.
        </p>
      </section>

      <section className="work" aria-labelledby="work-heading">
        <h2 id="work-heading">Work</h2>
        <ul className="cards">
          {projects.map((project) => (
            <li key={project.slug}>
              <Link to={`/projects/${project.slug}`} className="card">
                <div
                  className="card-visual"
                  style={{ '--accent': project.accent }}
                  aria-hidden="true"
                />
                <div className="card-body">
                  <h3>{project.title}</h3>
                  <p>{project.summary}</p>
                  <ul className="tags">
                    {project.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </div>
              </Link>
            </li>
          ))}
          <li>
            <Link to="/models" className="card">
              <div
                className="card-visual"
                style={{ '--accent': '#d40000' }}
                aria-hidden="true"
              />
              <div className="card-body">
                <h3>3D models</h3>
                <p>Upload and orbit 3D files, including 3MF and Blender.</p>
                <ul className="tags">
                  <li>GLB</li>
                  <li>3MF</li>
                  <li>Blend</li>
                </ul>
              </div>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  )
}
