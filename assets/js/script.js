let host = 'http://localhost:5000/api/';
let f = async (url, method = 'get', data = null, isToken = true) => {
    method = method.toUpperCase();
    let options = {
        method,
        headers: {}
    };
    if (isToken) {
        options.headers['Authorization'] = `Bearer ${app.user.token}`;
    }
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = JSON.stringify(data);
        options.headers['Content-type'] = 'application/json';
    }

    let res = await fetch(`${host}${url}`, options);
    return await res.json();

};


Vue.component('room', {
    props: ['room'],
    template: `
    <div class="room df jcc aic" @click="loadDevices">
         <img :src="room.photo" alt="" class="room-img">
         <div class="room-title font">{{room.name}}</div>
     </div>
    `,
    methods: {
        loadDevices() {
            app.go('devices-in-room-screen');
            app.loadRoom(this.room.id);
            app.room.selectedRoom = this.room;
        }
    }
});

Vue.component('device', {
    props: ['device'],
    template: `
    <div class="device font df fdc aic" :class="{'device-active':isToggleOn()}" @click="toggleValue(device.value)">
        <div class="device-room-name">{{device.room_name}}</div>
        <div class="device-name-box df fdc aic jcc">
            <div class="device-name">{{device.name}}</div>
            <div class="device-type-name">{{device.type_name}}</div>
        </div>
        <div class="device-value-box df aic jcc">
            <div class="value-btn-box">
                <button class="value-btn btn" @click="plusMinus(~~device.value-1)" v-if="device.typeId==6 && device.value>10">-</button>
            </div>
            <div class="device-value">{{device.value}}</div>
            <div class="value-btn-box">
                <button class="value-btn btn" @click="plusMinus(~~device.value+1)" v-if="device.typeId==6 && device.value<30">+</button>
            </div>
        </div>
    </div>
    `,
    methods: {
        isToggleOn() {
            return ['open', 'on'].includes(this.device.value);
        },
        async toggleValue(value) {
            if (this.device.typeId < 5) {
                value = negativeValue(value);
                await f(`devices/${this.device.id}`, 'patch', {
                    value: value
                })

            }

        },
        async plusMinus(value) {

            await f(`devices/${this.device.id}`, 'patch', {
                value: value
            })
        }
    }
})

Vue.component('macro', {
    props: ['macro'],
    template: `
      <div class="macro df">
          <div class="macro-box">
              <div class="macro-name font">{{macro.name}}</div>
          </div>
          <div class="macro-btns">
              <button class="macro-btn-del btn" @click="deleteMacro">x</button>
              <button class="macro-btn-act btn" @click="activateMacro">></button>
          </div>
      </div>
    `,
    methods: {
        async deleteMacro() {
            await f(`macros/${this.macro.id}`, 'delete');
        },
        async activateMacro() {
            await f(`macros/${this.macro.id}`);
        }
    }
})

function negativeValue(value) {
    let x = {
        'off': 'on',
        'on': 'off',
        'open': 'close',
        'close': 'open'
    }
    return x[value];
}
let app = new Vue({
    el: '#app',
    data: {
        user: {
            login: '',
            password: '',
            token: '',
            errors: []
        },
        home: {
            rooms: [],
            devices: [],
            macros: []
        },
        room: {
            selectedRoom: {},
            devices: []
        },
        macro: {
            name: '',
            devices: []
        },
        opened: ['auth-screen'],
        activeTab: 'first-tab',
        interval: null,
        flagDevices: false,
        flagButton: false
    },
    methods: {
        async autoRefresh() {
            clearInterval(this.interval);
            this.interval = setInterval(() => {
                if (this.isOpen('devices-in-room-screen')) {
                    this.loadRoom(this.room.selectedRoom.id);
                }
                if (this.isOpen('main-screen') && this.activeTab === 'devices-tab') {
                    this.loadDevices();
                }
                if (this.isOpen('main-screen') && this.activeTab === 'macros-tab') {
                    this.loadMacros();
                }
                this.checkFlagDevices();
            }, 1000);
        },
        async loadRoom(id) {
            this.room.devices = await f(`rooms/${id}/devices`);
        },
        async loadMacros() {
            this.home.macros = await f('macros');
        },
        go(screen) {
            this.opened.push(screen);
        },
        back() {
            this.opened.pop();
            this.clearMacro();
            this.activeTab = 'first-tab';
            if (this.opened.length === 1) {
                this.user.login = '';
                this.user.password = '';
                localStorage.clear();
            }
            this.checkFlagDevices();
        },
        changeTab(tab) {
            if (this.activeTab != 'devices-tab') {
                this.checkFlagDevices();
            }
            this.activeTab = tab;
        },
        isOpen(screen) {
            return this.opened[this.opened.length - 1] === screen;
        },
        async signIn() {
            const data = {
                login: this.user.login,
                password: this.user.password
            }
            let res = await f('users/login', 'post', data, false);

            if (res.message) {
                this.user.errors = res.message;
            }
            if (res.token) {
                this.user.token = res.token;
                this.go('main-screen');
                this.loadAllData();
                this.autoRefresh();
                localStorage.setItem('token', this.user.token);

            }
        },
        async loadAllData() {
            await this.loadRooms();
            await this.loadDevices();
        },
        async loadRooms() {
            this.home.rooms = await f('rooms');
            this.home.rooms.map(room => {
                room.photo = 'http://localhost:5000/' + room.photo;
            })
        },
        async loadDevices() {
            let devices = [];
            for (let room of this.home.rooms) {
                let res = await f(`rooms/${room.id}/devices`);
                res.forEach(z => {
                    z.room_name = room.name;
                    z.checked = false;
                })
                devices.push(...res);
            }
            this.home.devices = devices;
        },
        checkFlagDevices() {
            if (this.isOpen('devices-in-room-screen') || this.activeTab === 'devices-tab') {
                this.flagDevices = true;

            } else {
                this.flagDevices = false;

            }
        },
        pickDevices() {
            this.flagButton = !this.flagButton;
            this.activeTab = 'pick-devices-tab';
        },
        macroDeviceList() {
            this.flagButton = !this.flagButton;
            let res = this.home.devices;
            this.macro.devices = res.filter(z => z.checked);
            this.activeTab = 'picked-devices-tab';
        },
        async createMacro() {
            await f('macros', 'post', this.macro);
            this.clearMacro();
            this.activeTab = 'macros-tab';
            this.back();
        },
        clearMacro() {
            this.macro.name = '';
            this.macro.devices = [];
            let res = this.home.devices;
            res.forEach(z => z.checked = false);
        },
        toggleValue(device) {

            if (device.typeId < 5) {
                device.value = negativeValue(device.value);
            }
        },
        async loadStorage() {
            this.user.token = localStorage.getItem('token');
            if (this.user.token) {
                this.go('main-screen');
                this.autoRefresh();
                this.loadAllData();
            }
        }
    }
})

app.loadStorage();