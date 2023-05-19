import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(document.getElementById("root"));

/*
  Detecting impure calculations with StrictMode:
  --> In React, there are three kinds of inputs that you can read while rendering: props, state, and context. You should always treat these inputs as read-only.
  --> When you want to change something in response to user input, you should set state instead of writing to a variable. You should never change preexisting variables or objects while your component is rendering.
  --> React offers a “Strict Mode” in which it calls each component’s function twice during development. 
  --> By calling the component functions twice, Strict Mode helps find components that break these rules.
  --> Strict Mode has no effect in production, so it won’t slow down the app for your users.
  */
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
