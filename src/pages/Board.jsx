const PHRASES = ['saif is based', 'matias is meow']
const ROWS = 6
const COLUMNS = 7

const cells = Array.from({ length: ROWS * COLUMNS }, (_, index) => PHRASES[index % PHRASES.length])

export default function Board() {
  return (
    <article className="board">
      <p className="eyebrow">Board</p>
      <h1>Notes</h1>
      <div className="phrase-table-wrap">
        <table className="phrase-table">
          <tbody>
            {Array.from({ length: ROWS }, (_, row) => (
              <tr key={row}>
                {cells.slice(row * COLUMNS, row * COLUMNS + COLUMNS).map((phrase, column) => (
                  <td key={column}>{phrase}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}
