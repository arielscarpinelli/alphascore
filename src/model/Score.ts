export class Part {
    xml: Element;

    constructor(xml: Element) {
        this.xml = xml;
    }

    measures(): Array<Measure> {
        return Array.from(this.xml.getElementsByTagName("measure")).map(xml => new Measure(xml))
    }

    id() {
        return this.xml.getAttribute("id")!;
    }
}

export class Measure {
    xml: Element;

    constructor(xml: Element) {
        this.xml = xml;
    }

    // divisions
    // staves
    // cleff
    // key
    // time
    // direction/sound/tempo

    number() {
        return +this.xml.getAttribute("number")!;
    }

    duration() {
        return this.notesAndChordsByStaff().reduce((max, staff) =>
            Math.max(staff.reduce((staffMax, note) => Math.max(note.duration(), staffMax), 0), max), 0);
    }

    notes(): Array<INote> {
        return Array.from(this.xml.getElementsByTagName("note"))
            .map(xml => xml.getElementsByTagName("rest").length ? new Rest(xml) : new Note(xml));
    }

    notesAndChordsByStaff(): Array<Array<INote>> {
        // TODO: consider using "backup" elements
        const byVoice = this.notes().reduce((acc: Map<string, INote[]>, note) => {
            const staffIndex = note.staff() + note.voice();
            let group = acc.get(staffIndex);
            if (!group) {
                group = [];
                acc.set(staffIndex, group)
            }
            if (!note.inChord()) {
                group.push(note)
            } else if (note instanceof Note) {
                const previousNote = group[group.length - 1];
                let chord: Chord;
                if (!(previousNote instanceof Chord)) {
                    chord = new Chord([previousNote, note])
                } else {
                    chord = new Chord(previousNote.notes.concat([note]));
                }
                group[group.length - 1] = chord;
            };

            return acc;
        }, new Map());

        return Array.from(byVoice.values());
    }

    repeat(): { direction: string} | null {
        const direction = this.xml.getElementsByTagName("barline")[0]?.getElementsByTagName("repeat")[0]?.getAttribute("direction");
        return direction ? { direction } : null;
    }
}

// In MusicXML, notes, chords, rests, etc are "notes"
export interface INote {
    inChord(): boolean;
    staff(): string;
    voice(): string;
    name(): string;
    duration(): number;
}

export class Chord implements INote {
    notes: Array<INote>;

    constructor(notes: Array<INote>) {
        this.notes = notes.sort(Note.compare);
    }

    staff() {
        return this.notes[0].staff();
    }

    voice() {
        return this.notes[0].voice();
    }

    inChord() {
        return false; // chords are not inside chords...
    }

    name() {
        return this.notes.map(note => note.name()).join("\n");
    }

    duration() {
        return this.notes.reduce((max, note) => Math.max(note.duration(), max), 0)
    }

}

abstract class BaseNote implements INote {
    xml: Element;

    constructor(xml: Element) {
        this.xml = xml;
    }

    abstract name(): string;

    staff() {
        return this.xml.getElementsByTagName("staff")[0]?.innerHTML;
    }

    voice() {
        return this.xml.getElementsByTagName("voice")[0]?.innerHTML;
    }

    inChord() {
        return !!this.xml.getElementsByTagName("chord").length;
    }

    duration() {
        return (+this.xml.getElementsByTagName("duration")[0]?.innerHTML);
    }

}

interface Pitch {
    alter: string,
    step: string,
    octave: number,
    alterNumber: number
}

export class Note extends BaseNote {

    static steps = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

    static compare(a:INote, b:INote):number {
        if ((a instanceof Note) && (b instanceof Note)) {
            const aPitch = a.picth();
            const bPitch = b.picth();

            const octaveDiff = bPitch.octave - aPitch.octave;
            const noteDiff = Note.steps.indexOf(bPitch.step) - Note.steps.indexOf(aPitch.step)
            const alterDiff = bPitch.alterNumber - aPitch.alterNumber;

            if (octaveDiff !== 0) {
                return octaveDiff;
            }
            if (noteDiff !== 0) {
                return noteDiff;
            }
            if (alterDiff !== 0) {
                return alterDiff;
            }
        }
        return 0;
    }

    picth(): Pitch {
        const pitch = this.xml.getElementsByTagName("pitch")[0];
        const alterNumber = +pitch?.getElementsByTagName("alter")[0]?.innerHTML;
        let octave = +pitch?.getElementsByTagName("octave")[0].innerHTML;
        let step = pitch?.getElementsByTagName("step")[0].innerHTML;
        let alter = "";

        switch (alterNumber) {
            case 1:
                alter = "#";
                break;
            case -1:
                alter = "b";
                break;
            case 2:
                step = this.moveStep(step, 1);
                if (step === 'C') {
                    octave++;
                }
                break;
            case -2:
                step = this.moveStep(step, -1);
                if (step === 'B') {
                    octave--;
                }
        }

        return {
            alter,
            step,
            octave,
            alterNumber
        };
    }

    moveStep(step: string, distance: number) {
        return Note.steps[(Note.steps.indexOf(step) + distance) % Note.steps.length];
    }

    name() {
        const pitch = this.picth();
        const tie = this.tie();
        const tieStop = tie?.stop ? "︵" : "";
        const tieStart = tie?.start ? "︵" : "";
        return tieStop + (pitch.step + pitch.alter + pitch.octave) + tieStart;
    }

    tie(): {start?: boolean, stop?: boolean} | null {
        const type = this.xml.getElementsByTagName("tie")[0]?.getAttribute("type")
        switch(type) {
            case "start":
                return { start: true };
            case "stop":
                return { stop: true };    
        }
        return null;
    }
}

export class Rest extends BaseNote {

    name(): string {
        return "-";
    }

    inChord(): boolean {
        return false;
    }

}

export default class Score {
    xml: Document;

    constructor(musicXML: Document) {
        this.xml = musicXML;
    }

    static fromMusicXMLDom(xml: Document): Score {
        const score = new Score(xml);
        return score;
    }

    title() {
        return this.xml.getElementsByTagName("work-title")[0]?.innerHTML
    }

    parts(): Array<Part> {
        // TODO - support score-timewise
        return Array.from(this.xml.getElementsByTagName("part")).map(xml => new Part(xml))
    }

}