import React, { useState, useEffect } from 'react';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoListProps {
  heading?: string;
  backgroundColor?: string;
  textColor?: string;
  containerWidth?: 'narrow' | 'medium' | 'wide';
}

export function TodoList({
  heading = "My Todo List",
  backgroundColor = "#f8f8f8",
  textColor = "#333333",
  containerWidth = "medium"
}: TodoListProps) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');

  const containerWidthClass = {
    narrow: 'max-w-md',
    medium: 'max-w-2xl',
    wide: 'max-w-4xl'
  }[containerWidth];

  const addTodo = () => {
    if (newTodo.trim() === '') return;
    const newItem = {
      id: Date.now(),
      text: newTodo,
      completed: false
    };
    setTodos([...todos, newItem]);
    setNewTodo('');
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div style={{ backgroundColor, color: textColor }} className={`p-6 rounded-lg shadow-md mx-auto my-8 ${containerWidthClass}`}>
      <h2 className="text-2xl font-bold mb-4">{heading}</h2>
      
      <div className="flex mb-4">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new task..."
          className="flex-grow p-2 border rounded-l focus:outline-none"
          style={{ color: "#333" }}
        />
        <button 
          onClick={addTodo}
          className="px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700 transition-colors"
        >
          Add
        </button>
      </div>

      <ul className="space-y-2">
        {todos.length === 0 ? (
          <li className="italic opacity-75">No tasks yet. Add one above!</li>
        ) : (
          todos.map(todo => (
            <li 
              key={todo.id} 
              className="flex items-center justify-between p-3 border rounded bg-white"
              style={{ color: "#333" }}
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  className="mr-3 h-5 w-5"
                />
                <span style={{ 
                  textDecoration: todo.completed ? 'line-through' : 'none',
                  opacity: todo.completed ? 0.6 : 1
                }}>
                  {todo.text}
                </span>
              </div>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
} 