<script lang="ts">
  import { onMount } from 'svelte';

  let todos: { id: number; text: string; completed: boolean }[] = [];
  let newTodo = '';

  onMount(() => {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      todos = JSON.parse(savedTodos);
    }
  });

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (newTodo.trim()) {
      todos = [...todos, { id: Date.now(), text: newTodo.trim(), completed: false }];
      newTodo = '';
      saveTodos();
    }
  }

  function toggleTodo(id: number) {
    todos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    saveTodos();
  }

  function deleteTodo(id: number) {
    todos = todos.filter(todo => todo.id !== id);
    saveTodos();
  }

  function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
  }
</script>

<div class="min-h-screen bg-gray-100 py-8">
  <div class="max-w-2xl mx-auto px-4">
    <h1 class="text-3xl font-bold text-center text-gray-800 mb-8">TODOアプリ</h1>
    
    <form on:submit={handleSubmit} class="flex gap-2 mb-6">
      <input
        type="text"
        bind:value={newTodo}
        placeholder="新しいタスクを入力..."
        class="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <button
        type="submit"
        class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        追加
      </button>
    </form>

    <ul class="space-y-3">
      {#each todos as todo (todo.id)}
        <li class="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
          <input
            type="checkbox"
            checked={todo.completed}
            on:change={() => toggleTodo(todo.id)}
            class="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
          />
          <span class="flex-1 {todo.completed ? 'line-through text-gray-400' : 'text-gray-700'}">
            {todo.text}
          </span>
          <button
            type="button"
            on:click={() => deleteTodo(todo.id)}
            class="px-3 py-1 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
          >
            削除
          </button>
        </li>
      {/each}
    </ul>

    {#if todos.length === 0}
      <p class="text-center text-gray-500 mt-8">タスクがありません。新しいタスクを追加してください。</p>
    {/if}
  </div>
</div>

<style>
</style>
