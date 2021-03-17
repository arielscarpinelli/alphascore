import JSZip from 'jszip';

export default async function unzipAndParse(file: File) {
    const parser = new DOMParser();
    let fileText;
    if (file.name.indexOf(".mxl") !== -1) {
        const zip = await new JSZip().loadAsync(file);
        const container = await zip.file("META-INF/container.xml")?.async("string");
        const containerDoc = parser.parseFromString(container!, "text/xml");
        const xmlPath = containerDoc.getElementsByTagName("rootfile")[0]?.getAttribute("full-path");
        fileText = await zip.file(xmlPath!)!.async("string");
    } else {
        fileText = await file.text();
    }

    return parser.parseFromString(fileText, "text/xml")
}