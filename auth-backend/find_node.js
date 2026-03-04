const { execSync } = require('child_process');
try {
    const output = execSync('wmic process where "name=\'node.exe\'" get CommandLine, ExecutablePath, ProcessId, WorkingDirectory').toString();
    require('fs').writeFileSync('active_processes.txt', output);
    console.log('Processes written to active_processes.txt');
} catch (e) {
    require('fs').writeFileSync('active_processes.txt', 'Error: ' + e.message);
}
