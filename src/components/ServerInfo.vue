<template>
    <div style="width: 100%">
        <div style="display: flex">
            <fv-text-box
                v-model="form.ip"
                style="margin: 5px"
                prefix="WebSocket"
            ></fv-text-box>
            <fv-text-box
                v-model="form.token"
                style="margin: 5px"
                prefix="Token"
            ></fv-text-box>
            <fv-button style="margin: 5px" @click="newServer">添加</fv-button>
        </div>
        <fv-details-list
            style="width: 100%; height: 40%; margin-bottom: 50px"
            :head="header"
            :value="servers"
            @choose-items="clickItem"
        >
            <template v-slot:column_0="x">
                <p class="sec">{{ x.item.hostname }}</p>
            </template>
            <template v-slot:column_1="x">
                <p class="sec">{{ x.item.system }}</p>
            </template>
            <template v-slot:column_2="x">
                <p class="sec">{{ x.item.arch }}</p>
            </template>
            <template v-slot:column_3="x">
                <p class="sec" v-if="x.item.cpu">{{ x.item.cpu.count }}核</p>
            </template>
            <template v-slot:column_4="x">
                <p class="sec" v-if="x.item.mem">
                    {{ x.item.mem.total | memformat }}
                </p>
            </template>
            <template v-slot:column_5="x">
                <p class="sec">{{ x.item.ip }}</p>
            </template>
            <template v-slot:column_6="x">
                <p class="sec">{{ x.item.address }}</p>
            </template>
        </fv-details-list>
        <div>
            <canvas
                style="height: 400px; width: 100%"
                ref="cpu-memory-table"
                width="1920"
                height="400"
            />
        </div>
    </div>
</template>

<script>
import Chart from "chart.js";
export default {
    name: "ServerInfo",
    data() {
        return {
            servers: [],
            header: [
                {
                    content: "服务器名",
                    minWidth: 120,
                    width: 120,
                    sortName: "hostname",
                },
                {
                    content: "系统",
                    minWidth: 100,
                    width: 100,
                    sortName: "system",
                },
                {
                    content: "架构",
                    minWidth: 120,
                    width: 120,
                    sortName: "arch",
                },
                {
                    content: "CPU",
                    minWidth: 120,
                    width: 120,
                },
                {
                    content: "内存",
                    minWidth: 120,
                    width: 120,
                },
                {
                    content: "IP",
                    minWidth: 160,
                    width: 160,
                    sortName: "ip",
                },
                {
                    content: "地址",
                    minWidth: 60,
                    width: 80,
                    sortName: "address",
                },
            ],
            form: {
                ip: "localhost:10250",
                token: "123456",
            },
            selected: null,
        };
    },
    mounted() {
        this.initChart();
    },
    filters: {
        memformat: (val) => {
            if (!val) return "";
            if (val < 1024) return `${val}B`;
            if (val < 1024 * 1024) return `${Math.ceil(val / 1024)}KB`;
            if (val < 1024 * 1024 * 1024)
                return `${Math.ceil(val / 1024 / 1024)}MB`;
            return `${Math.ceil(val / 1024 / 1024 / 1024)}GB`;
        },
    },
    beforeDestroy() {
        this.servers.forEach((Element) => {
            if (Element.ws) {
                Element.ws.close();
            }
        });
    },
    methods: {
        guid() {
            function S4() {
                return (((1 + Math.random()) * 0x10000) | 0)
                    .toString(16)
                    .substring(1);
            }
            return (
                S4() +
                S4() +
                "-" +
                S4() +
                "-" +
                S4() +
                "-" +
                S4() +
                "-" +
                S4() +
                S4() +
                S4()
            );
        },
        getData(ws) {
            let obj;
            return (res) => {
                if (res.data) {
                    // 解析
                    let data = JSON.parse(res.data);
                    if (data.hostname != undefined) {
                        obj = data;
                        obj.chartdata = {
                            cpu: [...new Array(60).fill(0)],
                            mem: [...new Array(60).fill(0)],
                        };
                        data.ws = ws;
                        data.key = this.guid();
                        this.selected = data;
                        this.servers.push(data);
                    } else {
                        let updateData = (key, data) => {
                            if (obj.chartdata && obj.chartdata[key]) {
                                if (obj.chartdata[key].length >= 60) {
                                    obj.chartdata[key].shift();
                                }
                                obj.chartdata[key].push(data);
                            }
                        };
                        updateData("cpu", data.cpu);
                        updateData("mem", data.memory.percent);
                        if (this.chartjs) {
                            let update = (index, data) => {
                                if (this.selected.key != obj.key) {
                                    return;
                                }
                                if (
                                    this.chartjs.data.datasets[index].data
                                        .length >= 60
                                ) {
                                    this.chartjs.data.datasets[
                                        index
                                    ].data.shift();
                                }
                                this.chartjs.data.datasets[index].data.push(
                                    data
                                );
                                this.chartjs.update();
                            };
                            update(0, data.cpu);
                            update(1, data.memory.percent);
                        }
                    }
                }
            };
        },
        newServer() {
            this.getConnect(this.form.ip, this.form.token);
        },
        clickItem(item) {
            this.selected = this.servers.find(e=>e.key==item[0].key)
            this.chartjs.data.datasets[0].data.splice(
                0,
                60,
                ...this.selected.chartdata.cpu
            );
            this.chartjs.data.datasets[1].data.splice(
                0,
                60,
                ...this.selected.chartdata.mem
            );
            this.chartjs.update();
        },
        resetChart() {
            if (this.chartjs) {
                this.chartjs.data.datasets[0].data.splice(0, 60);
                this.chartjs.data.datasets[1].data.splice(0, 60);
                this.chartjs.data.datasets[0].data.push(
                    ...new Array(60).fill(0)
                );
                this.chartjs.data.datasets[1].data.push(
                    ...new Array(60).fill(0)
                );
            }
        },
        getConnect(url, token) {
            let wsurl = `ws://${url}/?token=${token}`;
            let index = this.servers.findIndex((e) => e.ws?.url == wsurl);
            if (index == -1) {
                this.resetChart();
                let ws = new WebSocket(wsurl);
                ws.onmessage = this.getData(ws);
            } else {
                this.selected = this.servers[index];
                this.chartjs.data.datasets[0].data.splice(
                    0,
                    60,
                    ...this.selected.chartdata.cpu
                );
                this.chartjs.data.datasets[1].data.splice(
                    0,
                    60,
                    ...this.selected.chartdata.mem
                );
                this.chartjs.update();
            }
        },
        initChart() {
            let ctx = this.$refs["cpu-memory-table"].getContext("2d");
            this.chartjs = new Chart(ctx, {
                type: "line",
                data: {
                    labels: [...new Array(60).fill("              ")],
                    datasets: [
                        {
                            label: "CPU使用率",
                            data: [...new Array(60).fill(0)],
                            backgroundColor: "rgba(46, 204, 113,0.2)",
                            borderColor: "rgba(46, 204, 113,1.0)",
                            borderWidth: 1,
                        },
                        {
                            label: "内存使用率",
                            data: [...new Array(60).fill(0)],
                            backgroundColor: "rgba(255, 99, 132, 0.2)",
                            borderColor: "rgba(255, 99, 132,1.0)",
                            borderWidth: 1,
                        },
                    ],
                },
                options: {
                    tooltips: {
                        callbacks: {
                            title: function () {
                                return "";
                            },
                            label: function (tooltipItems, data) {
                                let label =
                                    data.datasets[tooltipItems.datasetIndex]
                                        .label;
                                return (
                                    label +
                                    ":" +
                                    Math.ceil(tooltipItems.value) +
                                    "%"
                                );
                            },
                        },
                    },
                    scales: {
                        yAxes: [
                            {
                                display: false,
                                ticks: {
                                    beginAtZero: true,
                                    min: 0,
                                    max: 100,
                                },
                            },
                        ],
                        xAxes: [
                            {
                                display: false,
                                ticks: {
                                    display: false,
                                },
                            },
                        ],
                    },
                    legend: {
                        // display: false,
                    },
                },
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.table {
    width: 100%;
}
</style>