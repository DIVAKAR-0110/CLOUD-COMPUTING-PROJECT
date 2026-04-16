const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                text: "⚡ CloudMonitor | Team 12",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
                text: "Cloud Performance & Monitoring Project Documentation",
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "", spacing: { after: 400 } }),

            new Paragraph({
                text: "1. Project Introduction",
                heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
                children: [
                    new TextRun("Monitor and Analyze Performance (Team 12) is a cloud-based web application designed to monitor server CPU usage in real-time. The primary goal is to identify CPU spikes, explain the performance behavior of the server under load, and provide a secure interaction platform for users."),
                ],
                spacing: { after: 200 },
            }),

            new Paragraph({
                text: "2. Technical Stack",
                heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Frontend: ", bold: true }),
                    new TextRun("Vite, Vanilla JavaScript, Chart.js, CSS Design System"),
                ],
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Backend: ", bold: true }),
                    new TextRun("Node.js, Express, Socket.io (WebSockets)"),
                ],
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Database: ", bold: true }),
                    new TextRun("MongoDB Atlas (Cloud-based Cluster)"),
                ],
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Security: ", bold: true }),
                    new TextRun("JWT (JSON Web Tokens), Bcrypt Password Hashing, CORS, Helmet.js"),
                ],
                spacing: { after: 200 },
            }),

            new Paragraph({
                text: "3. System Architecture",
                heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
                text: "The application uses a real-time polling mechanism. The backend fetches OS metrics every 2 seconds using the 'systeminformation' library and broadcasts them to all connected clients via Socket.io. If a metric exceeds the predefined threshold (80% for CPU), it is flagged as a 'Spike' and persisted to the MongoDB database.",
                spacing: { after: 200 },
            }),

            new Paragraph({
                text: "4. Dashboard Feature Breakdown",
                heading: HeadingLevel.HEADING_3,
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: "Feature", bold: true })] }),
                            new TableCell({ children: [new Paragraph({ text: "Functionality", bold: true })] }),
                        ],
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: "Overview" })] }),
                            new TableCell({ children: [new Paragraph({ text: "Real-time gauges for CPU and Memory, Core-by-Core utilization, and current Status (Normal/Spiking)." })] }),
                        ],
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: "Live Monitor" })] }),
                            new TableCell({ children: [new Paragraph({ text: "Dynamic line charts showing the load trend and a list of the top 5 resource-consuming processes." })] }),
                        ],
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: "History" })] }),
                            new TableCell({ children: [new Paragraph({ text: "Interactive bar charts fetching data from MongoDB to show performance behavior over 1, 6, or 24 hours." })] }),
                        ],
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: "Alerts" })] }),
                            new TableCell({ children: [new Paragraph({ text: "A dedicated log for spike detection events, allowing administrators to audit and resolve incidents." })] }),
                        ],
                    }),
                ],
                spacing: { after: 200 },
            }),

            new Paragraph({
                text: "5. Performance Behavior Analysis (CPU Spikes)",
                heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
                text: "During testing, high load was simulated using a custom stress script. The CloudMonitor identified spikes accurately when utilization surpassed 80%. This behavior is critical for preventing server crashes in production environments, as it allows administrators to scale resources or terminate runaway processes before they impact user experience.",
                spacing: { after: 200 },
            }),

            new Paragraph({
                text: "6. Conclusion",
                heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
                text: "Team 12 has successfully delivered a robust Cloud Monitoring solution that meets all project requirements: real-time performance tracking, historical data analysis, and educational breakdown of server behavior.",
            }),
        ],
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("d:/CLOUD PROJECT/CloudMonitor_Project_Documentation.docx", buffer);
    console.log("✅ Documentation generated successfully as .docx");
});
