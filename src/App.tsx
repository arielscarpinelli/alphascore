import React, { ChangeEvent } from 'react';
import Score, { Part, Measure, INote } from './model/Score';
import JSZip from 'jszip';
import './App.css';

type AppState = {
  score?: Score
  error?: any
}

class App extends React.Component<{}, AppState> {

  state: Readonly<AppState> = {}

  loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const parser = new DOMParser();
    if (event.target.files) {
      const file = event.target.files[0];
      let musicXmlDom: Document;
      try {
        if (file.name.indexOf(".mxl") !== -1) {
          const zip = await new JSZip().loadAsync(file);
          const container = await zip.file("META-INF/container.xml")?.async("string");
          const containerDoc = parser.parseFromString(container!, "text/xml");
          const xmlPath = containerDoc.getElementsByTagName("rootfile")[0]?.getAttribute("full-path");
          musicXmlDom = parser.parseFromString(await zip.file(xmlPath!)!.async("string"), "text/html");
        } else {
          musicXmlDom = parser.parseFromString(await file.text(), "text/xml")
        }

        this.setState({
          score: Score.fromMusicXMLDom(musicXmlDom)
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
      {measure.notesAndChordsByStaff().map(staff => <ol className="stave">
        {staff.map(note => this.renderNote(note, duration))}
      </ol>)}
    </li>)
  }

  renderNote(note: INote, measureDuration: number) {
    return (<li style={{width: (note.duration() / measureDuration * 100) + '%'}}>{note.name().padEnd(3)}</li>)
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
