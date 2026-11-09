/** Two-sheet template shared by Admin and personal exam upload flows. */
export async function buildReadingExcelTemplate(): Promise<Blob> {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const passageRows = [
    ["group_id", "type", "title", "instruction", "passage"],
    ["RD01", "READING", "Reading 1", "Read the following passage and choose the best answer.", "Many students use online platforms to learn English. These tools help them access lessons anywhere."],
    ["CL01", "CLOZE", "Cloze test 1", "Choose the correct word for each numbered blank.", "Learning English is (3) ____ for students today."],
  ];
  const questionRows = [
    ["no", "group_id", "question", "A", "B", "C", "D", "correct", "explanation"],
    [1, "RD01", "What helps students access lessons anywhere?", "Online platforms", "Sports", "Paper maps", "Music concerts", "A", "The passage states that online platforms make lessons accessible."],
    [2, "RD01", "What subject is mentioned?", "Math", "English", "Science", "History", "B", ""],
    [3, "CL01", "Choose the word for blank (3).", "harmful", "useful", "unimportant", "late", "B", ""],
    [4, "", "She ____ to school every day.", "go", "goes", "going", "gone", "B", ""],
  ];
  return writeExcelFile([
    { sheet: "BAI_DOC", data: passageRows, columns: [14, 16, 22, 55, 88].map((width) => ({ width })), stickyRowsCount: 1 },
    { sheet: "CAU_HOI", data: questionRows, columns: [8, 14, 60, 30, 30, 30, 30, 12, 60].map((width) => ({ width })), stickyRowsCount: 1 },
  ]).toBlob();
}
