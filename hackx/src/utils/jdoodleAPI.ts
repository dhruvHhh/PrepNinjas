// ✅ JDoodle Compiler API Utility

export interface JDoodleResponse {
  output: string;
  statusCode: number;
  memory: string;
  cpuTime: string;
  error?: string;
}

const CLIENT_ID = process.env.REACT_APP_JDOODLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.REACT_APP_JDOODLE_CLIENT_SECRET || "";

// Language mapping for JDoodle
const LANGUAGE_MAP: Record<string, string> = {
  python: "python3",
  java: "java",
  cpp: "cpp",
  javascript: "nodejs",
  c: "c",
  php: "php",
  ruby: "ruby",
  go: "go",
  rust: "rust",
};

export async function compileAndExecuteJDoodle(
  code: string,
  language: string,
  stdin: string = ""
): Promise<JDoodleResponse> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return {
      output: "",
      statusCode: 400,
      memory: "0",
      cpuTime: "0",
      error: "JDoodle credentials not configured. Please add REACT_APP_JDOODLE_CLIENT_ID and REACT_APP_JDOODLE_CLIENT_SECRET to .env.local",
    };
  }

  try {
    const jdoodleLanguage = LANGUAGE_MAP[language] || language;

    const response = await fetch("https://api.jdoodle.com/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        script: code,
        language: jdoodleLanguage,
        stdin: stdin,
        versionIndex: "0",
      }),
    });

    if (!response.ok) {
      return {
        output: "",
        statusCode: response.status,
        memory: "0",
        cpuTime: "0",
        error: `HTTP Error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();

    return {
      output: data.output || "",
      statusCode: data.statusCode || 200,
      memory: data.memory || "0",
      cpuTime: data.cpuTime || "0",
      error: data.error || undefined,
    };
  } catch (err) {
    return {
      output: "",
      statusCode: 500,
      memory: "0",
      cpuTime: "0",
      error: `Network Error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// Test with timeout protection
export async function testCodeWithTimeout(
  code: string,
  language: string,
  input: string,
  timeoutMs: number = 8000
): Promise<JDoodleResponse> {
  return Promise.race([
    compileAndExecuteJDoodle(code, language, input),
    new Promise<JDoodleResponse>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              "Execution timeout (8s). Your code might have an infinite loop or take too long to execute."
            )
          ),
        timeoutMs
      )
    ),
  ]).catch((err) => ({
    output: "",
    statusCode: 500,
    memory: "0",
    cpuTime: "0",
    error: err instanceof Error ? err.message : String(err),
  }));
}
