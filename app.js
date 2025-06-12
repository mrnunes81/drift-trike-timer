/* Firebase JS principal separado para facilitar leitura */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-app.js";
import { getDatabase, ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDizfkzSJMXyY30M1hHTkxZ8PZjrMZtMmU",
  authDomain: "drift-trike-timer.firebaseapp.com",
  databaseURL: "https://drift-trike-timer-default-rtdb.firebaseio.com",
  projectId: "drift-trike-timer",
  storageBucket: "drift-trike-timer.appspot.com",
  messagingSenderId: "904950542869",
  appId: "1:904950542869:web:ec2d83299243aa6e82141c"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Código principal como enviado anteriormente foi transferido para este script externo
// por questões de organização no ZIP. Você pode incluir o conteúdo direto aqui ou deixar como está.