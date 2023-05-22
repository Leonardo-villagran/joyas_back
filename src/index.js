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
    console.log(`SOLICITUD DESDE LA WEB`);
    console.log('Url original:', req.hostname, (req.originalUrl));
    console.log(`Solicitud recibida: ${req.method} ${req.path}`);
    console.log('req.query: ', JSON.stringify(req.query, null, 2));
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

        const client = await pool.connect();
        let query = `SELECT * FROM inventario ORDER BY ${order_by} LIMIT $1 OFFSET $2`;

        const result = await client.query(query, [limit, offset]);
        const joyas = result.rows;
        res.json(joyas);
        client.release();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: `Error al obtener las joyas ${process.env.DB_USER} ${process.env.DB_HOST} ${process.env.DB_NAME} ${process.env.DB_PORT}` });
    }
});


app.get('/joyas/filtros', reportMiddleware, async (req, res) => {
    try {
        const client = await pool.connect();
        let query = 'SELECT * FROM inventario where 1=1';
        //Objeto que se utiliza para almacenar los valores ordenados para la consulta parametrizada.
        let values = [];
        const { precio_max, precio_min, categoria, metal} = req.query;

        const precio_maxTrim=precio_max.trim();
        const precio_minTrim=precio_min.trim();
        const categoriaLower= categoria.toLowerCase().trim();
        const metalLower = metal.toLowerCase().trim();

        if (precio_maxTrim) {
            query += ` AND precio <= $${values.length + 1}`;
            values.push(precio_maxTrim);
        }

        if (precio_minTrim) {
            query += ` AND precio >= $${values.length + 1}`;
            values.push(precio_minTrim);
        }

        if (categoriaLower) {
            query += ` AND categoria LIKE '%' || $${values.length + 1} || '%'`;
            values.push(categoriaLower);
        }

        if (metalLower) {
            query += ` AND metal LIKE '%' || $${values.length + 1} || '%'`;
            values.push(metalLower);
        }

        console.log(query);
        console.log(values);
        const result = await client.query(query, values);
        const joyas = result.rows;
        res.json(joyas);
        client.release();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener las joyas' });
    }
});

app.put('/joyas/:id', async (req, res) => {
    const id = req.params.id;
    const { likes } = req.body;
    const client = await pool.connect();
    try {
        const result = await client.query('UPDATE inventario SET likes = $1 WHERE id = $2 RETURNING *', [likes, id]);
        const updatedPost = result.rows[0];
        res.json(updatedPost);
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
});

// Ruta para insertar un nuevo post
app.post('/joyas', async (req, res) => {
    const { nombre, categoria, metal, precio, stock, img } = req.body;
    const likes = 0;
    try {
        const client = await pool.connect();
        const result = await client.query(
            'INSERT INTO inventario (nombre, categoria, metal, precio, stock, img) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [nombre, categoria, metal, precio, stock, img]
        );
        const postId = result.rows[0].id;
        console.log(result.rows[0]);
        res.json({ id: postId, nombre, categoria, metal, precio, stock, img });
        client.release();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al insertar el post' });
    }
});

app.delete('/joyas/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const client = await pool.connect();
        await client.query('DELETE FROM inventario WHERE id = $1', [id]);
        client.release();
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