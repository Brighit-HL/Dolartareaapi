class Indicador {
    constructor(codigo, nombre, unidad, fecha, valor) {
        this.codigo = codigo;
        this.nombre = nombre;
        this.unidad = unidad;
        this.fecha = fecha;
        this.valor = valor;
    }

    getFormattedValue() {
        if (this.unidad === 'Pesos') {
            return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(this.valor);
        } else if (this.unidad === 'Dólar') {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(this.valor);
        }
        return this.valor + ' ' + this.unidad;
    }
}



$(document).ready(function () {

    // VARIABLES GLOBALES
    let indicadoresData = [];
    let myChart = null; // Variable para almacenar la instancia del gráfico



    // Injectar Títulos y Textos
    $('#main-header').html(`
        <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
            <div class="container-fluid">
                <a class="navbar-brand" href="#">Indicadores Económicos Chile</a>
            </div>
        </nav>
    `);

    $('#filters-title').text('Filtros y Búsqueda');
    $('#label-filter-name').text('Buscar por Nombre');
    $('#label-filter-value').text('Valor Mayor a ($)');
    $('#label-filter-type').text('Filtrar por Código');
    $('#btn-load-data').text('Cargar Datos de API');

    $('#main-footer').html(`
        <div class="container">
            <p>Desarrollado por: Brighit Huaranga</p>
            <p><a href="https://drive.google.com/file/d/16EvklcXoiT2hEACAKrBKqItdBmc_ySbP/view?usp=drive_link" class="text-white text-decoration-none" target="_blank">Link de Descarga del Proyecto PRESIONAR</a></p>
            <small>&copy; 2024 Evaluación 3</small>
        </div>
    `);


    function fetchIndicators() {
        $('#btn-load-data').prop('disabled', true).text('Cargando...');
        $('#indicators-container').html('<div class="text-center w-100"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div></div>');

        $.ajax({
            url: 'https://mindicador.cl/api',
            method: 'GET',
            dataType: 'json',
            success: function (data) {
                console.log("Datos recibidos:", data);
                indicadoresData = [];

                for (let key in data) {

                    if (typeof data[key] === 'object' && data[key].codigo) {
                        const item = data[key];
                        // Crear Instancia de Clase
                        const indicador = new Indicador(
                            item.codigo,
                            item.nombre,
                            item.unidad_medida,
                            item.fecha,
                            item.valor
                        );
                        indicadoresData.push(indicador);
                    }
                }

                renderIndicators(indicadoresData);
                $('#btn-load-data').prop('disabled', false).text('Actualizar Datos');
            },
            error: function (error) {
                console.error("Error al obtener datos:", error);
                $('#indicators-container').html('<div class="alert alert-danger w-100" role="alert">Error al cargar los datos de la API. Intente nuevamente.</div>');
                $('#btn-load-data').prop('disabled', false).text('Reintentar');
            }
        });
    }

    // 3. FUNCIONES DE RENDERIZADO (DOM Manipulation) 
    function renderIndicators(list) {
        const container = $('#indicators-container');
        container.empty();

        if (list.length === 0) {
            container.html('<div class="col-12 text-center text-muted">No se encontraron indicadores que coincidan con los filtros.</div>');
            return;
        }

        list.forEach(ind => {
            // Crear carta de Bootstrap
            const cardHtml = `
                <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                    <div class="card h-100 border-primary mb-3 shadow-sm hover-effect">
                        <div class="card-header bg-transparent border-primary fw-bold text-uppercase">
                            ${ind.codigo}
                        </div>
                        <div class="card-body text-primary">
                            <h5 class="card-title text-dark">${ind.nombre}</h5>
                            <h2 class="card-text fw-bold text-center my-3">${ind.getFormattedValue()}</h2>
                            <p class="card-text"><small class="text-muted">Unidad: ${ind.unidad}</small></p>
                            <p class="card-text"><small class="text-muted">Fecha: ${new Date(ind.fecha).toLocaleDateString()}</small></p>
                            <div class="text-center">
                                <button class="btn btn-outline-primary btn-sm btn-chart" data-code="${ind.codigo}" data-name="${ind.nombre}">Ver Gráfico</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.append(cardHtml);
        });
    }


    function applyFilters() {
        const nameFilter = $('#filter-name').val().toLowerCase();
        const valueFilter = parseFloat($('#filter-value').val()) || 0;
        const typeFilter = $('#filter-type').val(); // 'all' o codigo especifico

        const filteredList = indicadoresData.filter(ind => {

            const matchName = ind.nombre.toLowerCase().includes(nameFilter) || ind.codigo.toLowerCase().includes(nameFilter);


            const val = parseFloat(ind.valor);
            const matchValue = !isNaN(val) && val >= valueFilter;

            // Filtro 3: Tipo (Código especifico)
            const matchType = (typeFilter === 'all') || (ind.codigo === typeFilter);

            return matchName && matchValue && matchType;
        });

        renderIndicators(filteredList);
    }


    $('#btn-load-data').on('click', function (e) {
        e.preventDefault();
        fetchIndicators();
    });


    $('#filter-name').on('input', function () {
        applyFilters();
    });


    $('#filter-type').on('change', function () {
        applyFilters();
    });


    $('#filter-value').on('input', function () {
        applyFilters();
    });


    $(document).on('click', '.btn-chart', function () {
        const codigo = $(this).data('code');
        const nombre = $(this).data('name');

        // Mostrar modal y loading
        $('#chartModalLabel').text(`Historial: ${nombre}`);
        $('#chartModal').modal('show');

        // Destruir gráfico anterior si existe
        if (myChart) {
            myChart.destroy();
        }

        // Llamada AJAX para historial
        $.ajax({
            url: `https://mindicador.cl/api/${codigo}`,
            method: 'GET',
            dataType: 'json',
            success: function (data) {
                // Preparar datos para el gráfico (últimos 10 días)
                const historial = data.serie.slice(0, 10).reverse(); // API devuelve orden descendente
                const labels = historial.map(item => new Date(item.fecha).toLocaleDateString());
                const values = historial.map(item => item.valor);

                const ctx = document.getElementById('indicatorChart').getContext('2d');
                myChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: `Valor ${nombre}`,
                            data: values,
                            borderColor: '#f472b6',  // Pink Dark (Pelo)
                            backgroundColor: 'rgba(247, 141, 167, 0.5)', // Pink Pie Body con transparencia
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: false
                            }
                        }
                    }
                });
            },
            error: function (error) {
                console.error("Error historial:", error);
                alert("No se pudo cargar el historial.");
            }
        });
    });

});
