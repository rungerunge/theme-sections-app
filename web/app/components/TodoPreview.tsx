import React, { useEffect } from 'react';
import { TodoList } from './Todo';
import html2canvas from 'html2canvas';

export function TodoPreview() {
  // Add some sample data
  useEffect(() => {
    // This would generate a preview image if needed
    const previewEl = document.getElementById('todo-preview');
    if (previewEl) {
      setTimeout(() => {
        html2canvas(previewEl).then(canvas => {
          // This would download the image
          // const link = document.createElement('a');
          // link.download = 'todo-preview.png';
          // link.href = canvas.toDataURL('image/png');
          // link.click();
          
          // Or could be sent to a server endpoint
          // const imageData = canvas.toDataURL('image/png');
          // fetch('/api/save-preview', {
          //   method: 'POST',
          //   body: JSON.stringify({ imageData, sectionId: 'todo-list' }),
          //   headers: { 'Content-Type': 'application/json' }
          // });
        });
      }, 500);
    }
  }, []);

  return (
    <div id="todo-preview" className="w-[800px] h-[600px] bg-white p-8">
      <TodoList 
        heading="Sample Todo List"
        backgroundColor="#f8f8f8"
        textColor="#333333"
        containerWidth="medium"
      />
      
      {/* Add some sample tasks directly in the DOM for preview purposes */}
      <script dangerouslySetInnerHTML={{
        __html: `
          setTimeout(() => {
            const todoList = document.querySelector('ul');
            if (todoList) {
              todoList.innerHTML = '';
              
              const items = [
                { completed: false, text: "Buy groceries" },
                { completed: true, text: "Finish project proposal" },
                { completed: false, text: "Schedule team meeting" },
                { completed: false, text: "Update website content" }
              ];
              
              items.forEach(item => {
                const li = document.createElement('li');
                li.className = "flex items-center justify-between p-3 border rounded bg-white";
                li.style.color = "#333";
                
                const div = document.createElement('div');
                div.className = "flex items-center";
                
                const checkbox = document.createElement('input');
                checkbox.type = "checkbox";
                checkbox.checked = item.completed;
                checkbox.className = "mr-3 h-5 w-5";
                
                const span = document.createElement('span');
                span.textContent = item.text;
                if (item.completed) {
                  span.style.textDecoration = "line-through";
                  span.style.opacity = "0.6";
                }
                
                const button = document.createElement('button');
                button.textContent = "✕";
                button.className = "text-red-500 hover:text-red-700";
                
                div.appendChild(checkbox);
                div.appendChild(span);
                li.appendChild(div);
                li.appendChild(button);
                todoList.appendChild(li);
              });
            }
          }, 100);
        `
      }} />
    </div>
  );
} 