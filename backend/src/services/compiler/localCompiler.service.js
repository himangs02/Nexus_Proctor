import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const execPromise = promisify(exec);

const TEMP_DIR = path.join(os.tmpdir(), 'nexus-compiler');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const LANGUAGE_CONFIGS = {
    javascript: {
        extension: 'js',
        command: 'node',
        args: (dir, file) => [path.join(dir, file)],
        isCompiled: false
    },
    python: {
        extension: 'py',
        command: 'python',
        args: (dir, file) => [path.join(dir, file)],
        isCompiled: false
    },
    c: {
        extension: 'c',
        compileCommand: (filePath, executablePath) => `gcc "${filePath}" -o "${executablePath}"`,
        command: (executablePath) => executablePath,
        args: () => [],
        isCompiled: true
    },
    cpp: {
        extension: 'cpp',
        compileCommand: (filePath, executablePath) => `g++ "${filePath}" -o "${executablePath}"`,
        command: (executablePath) => executablePath,
        args: () => [],
        isCompiled: true
    },
    java: {
        extension: 'java',
        compileCommand: (filePath) => `javac "${filePath}"`,
        command: () => `java`,
        args: (dirPath, fileName) => ['-cp', dirPath, 'Main'],
        isCompiled: true
    }
};


export const runLocalCode = async (language, code, stdin = '', timeout = 5000) => {
    const config = LANGUAGE_CONFIGS[language];
    if (!config) {
        throw new Error(`Unsupported language: ${language}`);
    }

    const sessionId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    const sessionDir = path.join(TEMP_DIR, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    // Java needs the filename to match the class name (usually Main)
    const fileName = language === 'java' ? 'Main.java' : `solution.${config.extension}`;
    const filePath = path.join(sessionDir, fileName);
    const executablePath = path.join(sessionDir, os.platform() === 'win32' ? 'solution.exe' : 'solution');

    console.log("------------------------------------------");
    console.log("EXECUTION START:", sessionId);
    console.log("LANGUAGE:", language);
    console.log("SOURCE FILE:", filePath);

    try {
        // Write source code
        fs.writeFileSync(filePath, code);

        // Compilation step
        if (config.isCompiled) {
            const compileCmd = typeof config.compileCommand === 'function' 
                ? config.compileCommand(filePath, executablePath) 
                : config.compileCommand;
            
            console.log("COMPILE CMD:", compileCmd);
            try {
                const { stderr } = await execPromise(compileCmd, { timeout: 10000 });
                if (stderr) {
                    console.log("COMPILE STDERR (Non-fatal):", stderr);
                }
            } catch (err) {
                console.log("COMPILATION ERROR:", err.stderr || err.message);
                return {
                    success: false,
                    errorType: "Compilation Error",
                    stderr: err.stderr || err.message,
                    runtime: 0,
                    memory: 0
                };
            }
        }

        // Execution step
        const runCmd = typeof config.command === 'function' ? config.command(executablePath || sessionDir) : config.command;
        const runArgs = config.args(sessionDir, fileName);

        console.log("RUN CMD:", runCmd, runArgs.join(' '));

        return new Promise((resolve) => {
            const start = Date.now();
            console.log(`[Spawn] Starting process: ${runCmd} ${runArgs.join(' ')} in ${sessionDir}`);
            
            const child = spawn(runCmd, runArgs, {
                cwd: sessionDir,
                shell: true, // Crucial for Windows to resolve commands in PATH
                env: { ...process.env, NODE_OPTIONS: '' } 
            });

            let stdout = '';
            let stderr = '';
            let killedByTimeout = false;

            const timer = setTimeout(() => {
                killedByTimeout = true;
                console.log(`[Spawn] Process timed out after ${timeout}ms, killing...`);
                child.kill();
            }, timeout);

            if (stdin) {
                console.log(`[Spawn] Writing to stdin: ${stdin.substring(0, 50)}...`);
                child.stdin.write(stdin);
            }
            child.stdin.end();


            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('error', (err) => {
                clearTimeout(timer);
                console.log("EXECUTION ERROR:", err.message);
                resolve({
                    success: false,
                    errorType: "Runtime Error",
                    stderr: err.message,
                    runtime: Date.now() - start,
                    memory: 0
                });
            });

            child.on('close', (code) => {
                clearTimeout(timer);
                const runtime = Date.now() - start;
                
                console.log("EXIT CODE:", code);
                console.log("STDOUT:", stdout.substring(0, 100) + (stdout.length > 100 ? '...' : ''));
                console.log("STDERR:", stderr);

                if (killedByTimeout) {
                    resolve({
                        success: false,
                        errorType: "Time Limit Exceeded",
                        stderr: "Execution timed out",
                        runtime,
                        memory: 0
                    });
                } else if (code !== 0) {
                    resolve({
                        success: false,
                        errorType: "Runtime Error",
                        stderr: stderr || `Exit code ${code}`,
                        runtime,
                        memory: 0
                    });
                } else {
                    resolve({
                        success: true,
                        output: stdout,
                        runtime,
                        memory: 0
                    });
                }
            });
        });

    } catch (err) {
        console.log("INTERNAL ERROR:", err.message);
        return {
            success: false,
            errorType: "Internal Server Error",
            stderr: err.message,
            runtime: 0,
            memory: 0
        };
    } finally {
        // Cleanup in a bit to allow for async file reads if any
        setTimeout(() => {
            try {
                if (fs.existsSync(sessionDir)) {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                    console.log("CLEANUP DONE:", sessionDir);
                }
            } catch (e) {
                console.error("CLEANUP FAILED:", e.message);
            }
        }, 1000);
    }
};
