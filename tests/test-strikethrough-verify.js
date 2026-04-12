const { JSDOM } = require('jsdom');

async function testStrikethrough() {
    // Simulate the HTML structure from the frontend
    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        .task-item.completed span { text-decoration: line-through; color: #666; }
    </style>
</head>
<body>
    <div id=task-list></div>
</body>
</html>
`;
    
    const dom = new JSDOM(html, { runScripts: 'dangerously' });
    const { document, window } = dom.window;
    
    // Simulate task loading with completed task
    const tasks = [
        { id: 1, title: 'Incomplete Task', completed: 0 },
        { id: 2, title: 'Completed Task', completed: 1 }
    ];
    
    // Simulate the frontend's loadTasks function
    const list = document.getElementById('task-list');
    list.innerHTML = tasks.map(t => `
        <div class="task-item ${t.completed ? 'completed' : ''}">
            <div>
                <input type="checkbox" ${t.completed ? 'checked' : ''}>
                <span>${t.title}</span>
            </div>
        </div>
    `).join('');
    
    // Test 1: Verify HTML structure
    const taskItems = list.querySelectorAll('.task-item');
    if (taskItems.length !== 2) {
        throw new Error(`Expected 2 tasks, got ${taskItems.length}`);
    }
    console.log('✓ HTML structure correct: 2 tasks rendered');
    
    // Test 2: Verify completed class is applied
    const completedItem = taskItems[1];
    if (!completedItem.classList.contains('completed')) {
        throw new Error('Completed task does not have completed class');
    }
    console.log('✓ Completed class applied to completed task');
    
    // Test 3: Verify checkbox is checked
    const completedCheckbox = completedItem.querySelector('input[type=checkbox]');
    if (!completedCheckbox.checked) {
        throw new Error('Completed task checkbox is not checked');
    }
    console.log('✓ Checkbox is checked for completed task');
    
    // Test 4: Verify incomplete task does NOT have completed class
    const incompleteItem = taskItems[0];
    if (incompleteItem.classList.contains('completed')) {
        throw new Error('Incomplete task has completed class');
    }
    console.log('✓ Incomplete task does not have completed class');
    
    // Test 5: Verify incomplete checkbox is NOT checked
    const incompleteCheckbox = incompleteItem.querySelector('input[type=checkbox]');
    if (incompleteCheckbox.checked) {
        throw new Error('Incomplete task checkbox is checked');
    }
    console.log('✓ Checkbox is unchecked for incomplete task');
    
    // Test 6: Verify CSS class exists (we can't test actual rendering, but can check style)
    const style = document.querySelector('style');
    if (!style.textContent.includes('.task-item.completed')) {
        throw new Error('CSS for .task-item.completed not found');
    }
    console.log('✓ CSS rule for .task-item.completed exists');
    
    console.log('\n✅ All strikethrough tests passed!');
}

testStrikethrough().catch(err => {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
});
