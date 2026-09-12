import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <article className="prose">
      <h1>Page not found</h1>
      <p>
        That URL is not on this site.{' '}
        <Link to="/">Back to work</Link>.
      </p>
    </article>
  )
}
