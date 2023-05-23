const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
require('dotenv').config();

const cors = require('cors');

const app = express();
//generar constante que determina el puerto a usar
const PORT = process.env.PORT || 3001;

app.use(cors());

// Configura body-parser para parsear las solicitudes JSON
app.use(bodyParser.json());

// Configura la conexión a la base de datos PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    allowExitOnIdle: true
});


const reportMiddleware = (req, res, next) => {
    console.log(`---------------------`);
    console.log(`SOLICITUD DESDE LA WEB DESDE CON QUERY`);
    console.log('Url original:', req.hostname);
    console.log(`Solicitud recibida: ${req.method}`);
    console.log(`Ruta: ${req.path}`);
    console.log('req.query: ', JSON.stringify(req.query, null, 2));
    console.log(`---------------------`);
    next();
};

const reportMiddleBody = (req, res, next) => {
    console.log(`---------------------`);
    console.log(`SOLICITUD DESDE LA WEB DESDE CON BODY`);
    console.log('Url original:', req.hostname);
    console.log(`Solicitud recibida: ${req.method}`);
    console.log(`Ruta: ${req.path}`);
    console.log('req.body: ', JSON.stringify(req.body, null, 2));
    console.log(`---------------------`);
    next();
};
const reportMiddleParams = (req, res, next) => {
    console.log(`---------------------`);
    console.log(`SOLICITUD DESDE LA WEB CON PARAMS`);
    console.log('Url original:', req.hostname);
    console.log(`Solicitud recibida: ${req.method}`);
    console.log(`Ruta: ${req.path}`);
    console.log('req.params: ', JSON.stringify(req.params, null, 2));
    console.log(`---------------------`);
    next();
};

// Ruta para obtener todos los posts
app.get('/joyas', reportMiddleware, async (req, res) => {
    try {
        let limit = req.query.limits || 10; // Valor por defecto 10

        // Verificar si el valor es vacío, cero o menor que cero
        if (isNaN(limit) || limit <= 0) {
            limit = 0; // Asignar el valor por defecto
        }

        let page = req.query.page || 1; // Valor por defecto 1
        // Verificar si el valor es vacío, cero o menor que cero
        if (isNaN(page) || page <= 0) {
            page = 1; // Asignar el valor por defecto
        }


        let order_by = req.query.order_by || 'id'; // Valor por defecto 'id'
        const allowed_columns = ['id', 'stock', 'categoria', 'metal', 'nombre', 'precio']; // Las columnas permitidas
        const order_by_parts = order_by.split('_'); // Separamos la columna del orden
        let order_column = order_by_parts[0];
        //console.log(` ${order_column}`);
        let order_direction = order_by_parts[1];

        if (typeof order_direction === "undefined") {
            order_direction = 'DESC';
        }

        if (!allowed_columns.includes(order_column)) { // Si la columna no es permitida, usamos la columna por defecto
            //console.log(`order_direction está indefinida`);
            let order = 1;
            //console.log(`Tipo orden: ${order_direction}`);
        } else {
            order_by = `${order_column} ${order_direction}`;
            //console.log(`Tipo orden: ${order_direction}`);
        }
        const offset = (page - 1) * limit;


        let query = `SELECT * FROM inventario ORDER BY ${order_by} LIMIT $1 OFFSET $2`;

        const result = await pool.query(query, [limit, offset]);
        const joyas = result.rows;
        res.json(joyas);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: `Error al obtener las joyas ${process.env.DB_USER} ${process.env.DB_HOST} ${process.env.DB_NAME} ${process.env.DB_PORT}` });
    }
});

//Ruta para obtener una joya

app.get('/joyas/edit/:id', reportMiddleParams, async (req, res) => {

    const id = req.params.id;
    try {

        const result = await pool.query('SELECT * FROM inventario WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Joya no encontrada' });
        }

        const joya = result.rows[0];
        res.json(joya);
    } catch (error) {
        console.error('Error al obtener la joya', error);
        res.status(500).json({ mensaje: 'Error al obtener la joya' });
    }

});

app.get('/joyas/filtros', reportMiddleware, async (req, res) => {
    try {

        let query = 'SELECT * FROM inventario where 1=1';
        //Objeto que se utiliza para almacenar los valores ordenados para la consulta parametrizada.
        let values = [];
        const { precio_max, precio_min, categoria, metal } = req.query;

        /* const precioMinEntero = parseInt(precio_min, 10);
         const precioMaxEntero = parseInt(precio_max, 10);
 
         console.log("precio_min:", precioMinEntero);
         console.log("precio_max:", precioMaxEntero);*/

        if (precio_max) {
            query += ` AND precio <= $${values.length + 1}`;
            values.push(precio_max);
        }

        if (precio_min) {
            query += ` AND precio >= $${values.length + 1}`;
            values.push(precio_min);
        }

        if (categoria) {
            const categoriaLower = categoria.toLowerCase().trim();
            query += ` AND categoria LIKE '%' || $${values.length + 1} || '%'`;
            values.push(categoriaLower);
        }

        if (metal) {
            const metalLower = metal.toLowerCase().trim();
            query += ` AND metal LIKE '%' || $${values.length + 1} || '%'`;
            values.push(metalLower);
        }

        console.log(query);
        console.log(values);
        const result = await pool.query(query, values);
        const joyas = result.rows;
        res.json(joyas);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener las joyas' });
    }
});

app.put('/joyas/edit/:id', reportMiddleBody, async (req, res) => {
    const { id } = req.params;
    console.log("id :",id);
    const { nombre, categoria, metal, precio, stock, img } = req.body;
    try {
        const query = 'UPDATE inventario SET nombre = $1, categoria = $2, metal = $3, precio = $4, stock = $5, img = $6 WHERE id = $7 RETURNING *';
        const values = [nombre, categoria, metal, precio, stock, img, id];

        const result = await pool.query(query, values);

        const updatedItem = result.rows[0];
        res.json(updatedItem);
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Ruta para insertar un nuevo post
app.post('/joyas', reportMiddleBody, async (req, res) => {
    const { nombre, categoria, metal, precio, stock, img } = req.body;

    try {

        const result = await pool.query(
            'INSERT INTO inventario (nombre, categoria, metal, precio, stock, img) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [nombre, categoria, metal, precio, stock, img]
        );
        const postId = result.rows[0].id;
        console.log(result.rows[0]);
        res.json({ id: postId, nombre, categoria, metal, precio, stock, img });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al insertar el post' });
    }
});

app.delete('/joyas/:id', reportMiddleParams, async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM inventario WHERE id = $1', [id]);
        console.log("Joya Borrada de id: ", id);
        res.sendStatus(204);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Servidor de Express escuchando en el puerto ${PORT}`);
});