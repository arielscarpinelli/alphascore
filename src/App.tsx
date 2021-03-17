import React, { ChangeEvent } from 'react';
import Score, { Part, Measure, INote } from './model/Score';
import './App.css';
import unzipAndParse from './util/Zip';

type AppState = {
  score?: Score
  error?: any
}

class App extends React.Component<{}, AppState> {

  state: Readonly<AppState> = {}

  loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const file = event.target.files[0];
      try {
        this.setState({
          score: Score.fromMusicXMLDom(await unzipAndParse(file))
        })
      } catch (e) {
        this.setState({
          error: e
        })
      }
    }
  }

  renderScore() {
    if (!this.state.score) {
      return null;
    }
    const score = this.state.score;
    return (<div>
      <h1>{score.title()}</h1>
      {score.parts().map(part => this.renderPart(part))}
    </div>)
  }

  renderPart(part: Part) {
    return (<div className="part" key={part.id()}>
      <ol className="measures">{part.measures().map(measure => this.renderMeasure(measure))}
      </ol>
    </div>)
  }

  renderMeasure(measure: Measure) {
    const duration = measure.duration();
    return (<li className="measure" value={measure.number()} key={measure.number()}>
      {((measure.number() % 10) === 0) ? <small className={"measureNumber"}>{measure.number()}</small> : null}
      {measure.repeat() ? <div className={"repeat " + measure.repeat()!.direction}>:</div> : null}
      {measure.notesAndChordsByStaff().map(staff => <ol className="stave">
        {staff.map((note, idx) => this.renderNote(note, idx, duration))}
      </ol>)}
    </li>)
  }

  renderNote(note: INote, index: number, measureDuration: number) {
    return (<li key={index} style={{width: (note.duration() / measureDuration * 100) + '%'}}>{note.name().padEnd(3)}</li>)
  }

  render() {
    return (
      <div className="App">
        <input type="file" onChange={this.loadFile} className="fileselect"/>
        {this.renderScore()}
        {this.state.error ? <div>{this.state.error}</div> : null}
      </div>
    );
  }
}

export default App;
