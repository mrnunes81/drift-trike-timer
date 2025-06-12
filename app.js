// Config Firebase - Substitua pelos seus dados reais
const firebaseConfig = {
  apiKey: "AIzaSyDizfkzSJMXyY30M1hHTkxZ8PZjrMZtMmU",
  authDomain: "drift-trike-timer.firebaseapp.com",
  databaseURL: "https://drift-trike-timer-default-rtdb.firebaseio.com",
  projectId: "drift-trike-timer",
  storageBucket: "drift-trike-timer.firebasestorage.app",
  messagingSenderId: "904950542869",
  appId: "1:904950542869:web:ec2d83299243aa6e82141c"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const RATE_PER_10_MIN = 10; // R$ 10 por 10 minutos (ajuste como quiser)
const TRIKES_COUNT = 3;

const trikesContainer = document.getElementById('trikesContainer');
const dailyReportDiv = document.getElementById('dailyReport');

const trikes = Array(TRIKES_COUNT).fill(null).map(() => ({
  timer: null,
  timeLeft: 0,
  isRunning: false,
  isPaused: false,
  value: 0,
  discount: 0,
  finalValue: 0
}));

// Formatar segundos para MM:SS
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function playAlert() {
  alert('Tempo esgotado!');
}

// Criar interface e controlar timer por trike
function createTrikeUI(trikeId) {
  const div = document.createElement('div');
  div.id = `trike-${trikeId}`;
  div.className = 'bg-white p-5 rounded-lg shadow-md';

  div.innerHTML = `
    <h3 class="text-xl font-semibold mb-3 text-gray-800">Drift Trike ${trikeId}</h3>

    <div class="mb-3">
      <label class="block font-medium mb-1">Selecionar Tempo</label>
      <div class="flex space-x-3 mb-2">
        <button id="btn10min-${trikeId}" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded">10 Min</button>
        <button id="btn20min-${trikeId}" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded">20 Min</button>
      </div>
      <input id="customTime-${trikeId}" type="number" min="1" placeholder="Tempo personalizado (min)" class="w-full border border-gray-300 rounded p-2 text-sm" />
    </div>

    <div class="mb-3">
      <label class="block font-medium mb-1">Desconto (R$)</label>
      <input id="discount-${trikeId}" type="number" min="0" step="0.01" placeholder="0.00" class="w-full border border-gray-300 rounded p-2 text-sm" />
    </div>

    <div class="mb-3">
      <label class="block font-medium mb-1">Status de Pagamento</label>
      <select id="paymentStatus-${trikeId}" class="w-full border border-gray-300 rounded p-2 text-sm">
        <option value="nao_pago">Não Pago</option>
        <option value="pago">Pago</option>
      </select>
    </div>

    <div class="flex space-x-3 mb-4">
      <button id="startTimer-${trikeId}" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">Iniciar</button>
      <button id="pauseTimer-${trikeId}" class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded hidden">Pausar</button>
      <button id="resumeTimer-${trikeId}" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded hidden">Retomar</button>
      <button id="resetTimer-${trikeId}" class="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded hidden">Resetar</button>
    </div>

    <div id="timerStatus-${trikeId}" class="hidden text-gray-700">
      <p><strong>Tempo Restante:</strong> <span id="timeRemaining-${trikeId}">00:00</span></p>
      <p>Valor: R$ <span id="currentValue-${trikeId}">0.00</span></p>
      <p>Desconto: R$ <span id="currentDiscount-${trikeId}">0.00</span></p>
      <p>Valor Final: R$ <span id="finalValue-${trikeId}">0.00</span></p>
      <p>Status: <span id="currentPaymentStatus-${trikeId}">Não Pago</span></p>
    </div>
  `;

  trikesContainer.appendChild(div);

  // Elementos
  const trike = trikes[trikeId - 1];
  const btn10min = div.querySelector(`#btn10min-${trikeId}`);
  const btn20min = div.querySelector(`#btn20min-${trikeId}`);
  const startBtn = div.querySelector(`#startTimer-${trikeId}`);
  const pauseBtn = div.querySelector(`#pauseTimer-${trikeId}`);
  const resumeBtn = div.querySelector(`#resumeTimer-${trikeId}`);
  const resetBtn = div.querySelector(`#resetTimer-${trikeId}`);
  const customTimeInput = div.querySelector(`#customTime-${trikeId}`);
  const discountInput = div.querySelector(`#discount-${trikeId}`);
  const paymentStatus = div.querySelector(`#paymentStatus-${trikeId}`);
  const timerStatus = div.querySelector(`#timerStatus-${trikeId}`);
  const timeRemaining = div.querySelector(`#timeRemaining-${trikeId}`);
  const currentValue = div.querySelector(`#currentValue-${trikeId}`);
  const currentDiscount = div.querySelector(`#currentDiscount-${trikeId}`);
  const finalValue = div.querySelector(`#finalValue-${trikeId}`);
  const currentPaymentStatus = div.querySelector(`#currentPaymentStatus-${trikeId}`);

  // Atualiza UI dos botões e status
  function updateUI() {
    startBtn.disabled = trike.isRunning;
    pauseBtn.classList.toggle('hidden', !trike.isRunning || trike.isPaused);
    resumeBtn.classList.toggle('hidden', !trike.isPaused);
    resetBtn.classList.toggle('hidden', !trike.isRunning && trike.timeLeft === 0);
    timerStatus.classList.toggle('hidden', !trike.isRunning && trike.timeLeft === 0);
  }

  // Salvar estado no Firebase
  function saveStateToFirebase() {
    database.ref(`trikes/${trikeId}`).set({
      timeLeft: trike.timeLeft,
      isRunning: trike.isRunning,
      isPaused: trike.isPaused,
      value: trike.value,
      discount: trike.discount,
      finalValue: trike.finalValue,
      paymentStatus: paymentStatus.value
    });
  }

  // Calcular valores com desconto
  function calculateValues(minutes) {
    const val = (minutes / 10) * RATE_PER_10_MIN;
    const disc = parseFloat(discountInput.value) || 0;
    return {
      value: val,
      discount: disc,
      finalValue: val - disc
    };
  }

  // Atualizar tempo formatado
  function formatAndUpdateTime() {
    timeRemaining.textContent = formatTime(trike.timeLeft);
  }

  // Função que inicia o timer
  function startTimer(minutes) {
    if (trike.timer) clearInterval(trike.timer);

    const vals = calculateValues(minutes);
    trike.value = vals.value;
    trike.discount = vals.discount;
    trike.finalValue = vals.finalValue;
    trike.timeLeft = minutes * 60;
    trike.isRunning = true;
    trike.isPaused = false;

    currentValue.textContent = trike.value.toFixed(2);
    currentDiscount.textContent = trike.discount.toFixed(2);
    finalValue.textContent = trike.finalValue.toFixed(2);
    currentPaymentStatus.textContent = paymentStatus.value === 'pago' ? 'Pago' : 'Não Pago';

    saveStateToFirebase();
    updateUI();
    formatAndUpdateTime();

    trike.timer = setInterval(() => {
      if (!trike.isPaused) {
        trike.timeLeft--;
        formatAndUpdateTime();
        database.ref(`trikes/${trikeId}/timeLeft`).set(trike.timeLeft);

        if (trike.timeLeft <= 0) {
          clearInterval(trike.timer);
          trike.isRunning = false;
          trike.timer = null;
          playAlert();

          // Salvar sessão no relatório
          const newSessionKey = database.ref('sessions').push().key;
          database.ref(`sessions/${newSessionKey}`).set({
            trikeId,
            minutes,
            value: trike.value,
            discount: trike.discount,
            finalValue: trike.finalValue,
            paymentStatus: paymentStatus.value,
            timestamp: Date.now()
          });

          updateReport();
          updateUI();
          saveStateToFirebase();
        }
      }
    }, 1000);
  }

  // Eventos dos botões
  btn10min.addEventListener('click', () => startTimer(10));
  btn20min.addEventListener('click', () => startTimer(20));

  startBtn.addEventListener('click', () => {
    const customMinutes = parseInt(customTimeInput.value);
    if (isNaN(customMinutes) || customMinutes <= 0) {
      alert('Informe um tempo válido!');
      return;
    }
    startTimer(customMinutes);
  });

  pauseBtn.addEventListener('click', () => {
    if (trike.isRunning && !trike.isPaused) {
      trike.isPaused = true;
      updateUI();
      saveStateToFirebase();
    }
  });

  resumeBtn.addEventListener('click', () => {
    if (trike.isRunning && trike.isPaused) {
      trike.isPaused = false;
      updateUI();
      saveStateToFirebase();
    }
  });

  resetBtn.addEventListener('click', () => {
    if (trike.timer) {
      clearInterval(trike.timer);
      trike.timer = null;
    }
    trike.isRunning = false;
    trike.isPaused = false;
    trike.timeLeft = 0;
    trike.value = 0;
    trike.discount = 0;
    trike.finalValue = 0;

    currentValue.textContent = '0.00';
    currentDiscount.textContent = '0.00';
    finalValue.textContent = '0.00';
    timeRemaining.textContent = '00:00';
    currentPaymentStatus.textContent = 'Não Pago';

    updateUI();
    saveStateToFirebase();
  });

  // Escuta alterações no Firebase para sincronizar estado entre dispositivos
  database.ref(`trikes/${trikeId}`).on('value', snapshot => {
    const data = snapshot.val();
    if (data) {
      trike.isRunning = data.isRunning;
      trike.isPaused = data.isPaused || false;
      trike.timeLeft = data.timeLeft || 0;
      trike.value = data.value || 0;
      trike.discount = data.discount || 0;
      trike.finalValue = data.finalValue || 0;

      currentValue.textContent = trike.value.toFixed(2);
      currentDiscount.textContent = trike.discount.toFixed(2);
      finalValue.textContent = trike.finalValue.toFixed(2);
      currentPaymentStatus.textContent = data.paymentStatus === 'pago' ? 'Pago' : 'Não Pago';

      formatAndUpdateTime();

      if (trike.isRunning && !trike.timer) {
        trike.timer = setInterval(() => {
          if (!trike.isPaused) {
            trike.timeLeft--;
            formatAndUpdateTime();
            database.ref(`trikes/${trikeId}/timeLeft`).set(trike.timeLeft);

            if (trike.timeLeft <= 0) {
              clearInterval(trike.timer);
              trike.isRunning = false;
              trike.timer = null;
              playAlert();
              updateUI();
            }
          }
        }, 1000);
      } else if (!trike.isRunning && trike.timer) {
        clearInterval(trike.timer);
        trike.timer = null;
        timerStatus.classList.add('hidden');
      }

      updateUI();
    }
  });

  updateUI();
}

// Atualiza relatório diário com as sessões do dia atual
function updateReport() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 86400000;

  database.ref('sessions').orderByChild('timestamp').startAt(startOfDay).endAt(endOfDay).once('value', snapshot => {
    const sessions = snapshot.val() || {};
    const sessionList = Object.values(sessions);

    if (sessionList.length === 0) {
      dailyReportDiv.innerHTML = '<p>Nenhuma sessão registrada hoje.</p>';
      return;
    }

    let totalSessions = 0;
    let totalValue = 0;
    let totalDiscount = 0;
    let totalFinal = 0;

    const reportHTML = sessionList.map((session, i) => {
      totalSessions++;
      totalValue += session.value;
      totalDiscount += session.discount;
      totalFinal += session.finalValue;

      return `
        <div class="border-b py-2">
          <p><strong>Trike:</strong> ${session.trikeId}</p>
          <p><strong>Tempo:</strong> ${session.minutes} min</p>
          <p><strong>Valor:</strong> R$ ${session.value.toFixed(2)}</p>
          <p><strong>Desconto:</strong> R$ ${session.discount.toFixed(2)}</p>
          <p><strong>Valor Final:</strong> R$ ${session.finalValue.toFixed(2)}</p>
          <p><strong>Status:</strong> ${session.paymentStatus === 'pago' ? 'Pago' : 'Não Pago'}</p>
        </div>
      `;
    }).join('');

    dailyReportDiv.innerHTML = `
      ${reportHTML}
      <div class="mt-4 border-t pt-3 font-semibold">
        <p>Total sessões: ${totalSessions}</p>
        <p>Valor bruto: R$ ${totalValue.toFixed(2)}</p>
        <p>Total descontos: R$ ${totalDiscount.toFixed(2)}</p>
        <p>Valor líquido: R$ ${totalFinal.toFixed(2)}</p>
      </div>
    `;
  });
}

// Criar UIs para os trikes
for (let i = 1; i <= TRIKES_COUNT; i++) {
  createTrikeUI(i);
}

// Atualiza relatório a cada 30 segundos
setInterval(updateReport, 30000);
updateReport();
