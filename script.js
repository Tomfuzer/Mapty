'use strict';

//Classe pai dos objetos que serão criados na aplicação
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // array [lat, lgn]
    this.distance = distance; //km
    this.duration = duration; //min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    }${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

//Classes filhos, objetos da aplicação
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration); //lembrar da função do super na criação de classes com herança
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////////////////////////////

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// Classe de aplicação com os métodos
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoom = 13;

  constructor() {
    // Pegando a posição do usuário
    this._getPosition();
    //Recuperando os dados armazenados no localStorage, simulando a persistência dos dados
    this._getLocalStorage();

    //Rendering Workout Input Form
    form.addEventListener('submit', this._newWorkout.bind(this)); //importante lembrar da necessidade de utilização do bind em relação as chamadas de função
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  // Pegando a posição do usuário por geolocalização e chamando a função loadMap pra carregar a page
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Não foi possível acessar sua localização!');
        }
      );
    }
  }

  _loadMap(position) {
    // Using the Geolocation API

    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com.br/maps/@${latitude},${longitude}`);

    //transformando latitude e longitude em um vetor
    const coords = [latitude, longitude];

    //renderizando o mapa pela API setando como ponto focal a localização do usuário
    this.#map = L.map('map').setView(coords, this.#mapZoom);

    // Displaying a Map Using Leaflet Library
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Displaying Map Marker
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE; //alocando mapE para uma variável global
    form.classList.remove('hidden');
    inputDistance.focus(); // focar no campo UX++
  }

  _hideForm() {
    //Esconder o formulário e limpar os campos
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  // Alterando o tipo de evento entre bike e corrida
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // Criando um objeto workout do tipo bike ou corrida
  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp)); // Verificar se os valores são numericos
    const allPositive = (...inputs) => inputs.every(inp => inp > 0); // Verificar se os valores são positivos

    e.preventDefault();
    // Receber os dados do formulário
    const type = inputType.value;
    const distance = +inputDistance.value; //type coercion
    const duration = +inputDuration.value; //type coercion
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // Se for corrida, criar objeto Running
    if (type == 'running') {
      const cadence = +inputCadence.value;
      // Verificar se os dados são válidos
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Os valores precisam ser números positivos!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // Se for bicicleta, criar o objeto Cycling
    if (type == 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Os valores precisam ser números positivos!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Adicionar objeto ao array
    this.#workouts.push(workout);

    this._renderWorkoutMarker(workout);
    // Renderizar a lista com as atividades recém executadas

    this._renderWorkout(workout);
    // Esconde o formulário

    this._hideForm();

    // Armazenando os objetos no localStorage
    this._setLocalStorage();
  }

  // Renderizar as marcações no mapa
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords) // Dúvida sobre essa etapa consultar a documentação da API Leaflet pra entender o que está sendo feito e porque dos parâmetros
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  // Renderizar as marcações na lista/histórico
  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
      `;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
        `;

    form.insertAdjacentHTML('afterend', html);
  }

  // Efeito de movimento do mapa até o registro selecionado (click)
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // Using a public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workout', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workout'));
    // console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  //Reset do locaStorage
  reset() {
    localStorage.removeItem('workout');
    location.reload();
  }
}

const app = new App();
