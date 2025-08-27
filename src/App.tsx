import React from "react";

// Minimal test to ensure React is working
const TestComponent = () => {
  console.log("React in TestComponent:", React);
  const [count, setCount] = React.useState(0);
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Health Dashboard Test</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};

const App = () => {
  console.log("React in App:", React);
  return <TestComponent />;
};

export default App;