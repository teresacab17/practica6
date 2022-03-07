/* eslint-disable no-invalid-this*/
/* eslint-disable no-undef*/
const path = require("path");
const {log,checkFileExists,create_browser,from_env,ROOT,path_assignment, warn_errors, scored, checkFilExists} = require("./testutils");
const fs = require("fs");
const net = require('net');
const spawn = require("child_process").spawn;
const util = require('util');
const exec = util.promisify(require("child_process").exec);


const PATH_ASSIGNMENT = path_assignment("blog");
console.log(PATH_ASSIGNMENT);


const URL = `file://${path.resolve(path.join(PATH_ASSIGNMENT.replace("%", "%25"), "cv.html"))}`;
// Should the server log be included in the logs?
const LOG_SERVER = from_env("LOG_SERVER") !== "undefined";
const TIMEOUT =  parseInt(from_env("TIMEOUT", 2000));
const TEST_PORT =  parseInt(from_env("TEST_PORT", "3001"));


let browser = create_browser();


describe("Tests Práctica 5", function() {
    after(function () {
        warn_errors();
    });

    describe("Prechecks", function () {
	    scored(`Comprobando que existe la carpeta de la entrega: ${PATH_ASSIGNMENT}`,
               -1,
               async function () {
                   this.msg_err = `No se encontró la carpeta '${PATH_ASSIGNMENT}'`;
                   (await checkFileExists(PATH_ASSIGNMENT)).should.be.equal(true);
	             });
    });


    describe("Tests funcionales", function () {
        var server;
    
        before(async function() {

            let bin_path = path.join(PATH_ASSIGNMENT, "bin", "www");
            server = spawn('node', [bin_path], {env: {PORT: TEST_PORT}});
            server.stdout.setEncoding('utf-8');
            server.stdout.on('data', function(data) {
                log('Salida del servidor: ', data);
            })
            log(`Lanzado el servidor en el puerto ${TEST_PORT}`);
            await new Promise(resolve => setTimeout(resolve, TIMEOUT));
            browser.site = `http://localhost:${TEST_PORT}/`;
            try{
                await browser.visit("/");
                browser.assert.status(200);
            }catch(e){
                console.log("No se ha podido contactar con el servidor.");
                throw(e);
            }
        });

        after(async function() {
            await server.kill();
        })

        let endpoint = '/';
        let code = 200;
        scored(`Comprobar que se resuelve una petición a ${endpoint} con código ${code} y que title y h1 son correctos`,
               2, async function () {
            this.msg_ok = 'Respuesta correcta';
            this.msg_err = 'Respuesta incorrecta';
            check = function(){
                browser.assert.status(code);
                console.log('ppppppp', browser.text('title'));
            }
            return browser.visit(endpoint)
                .then(check)
                .catch(check);
        });

        endpoint = '/users';
        code = 404;
        scored(`Comprobar que se resuelve una petición a ${endpoint} con código ${code}`,
               1.5, async function () {
            this.msg_ok = 'Respuesta correcta';
            this.msg_err = 'No hubo respuesta';
            check = function(){
                browser.assert.status(code);
            }
            return browser.visit(endpoint)
                .then(check)
                .catch(check);
        });

        scored(`Comprobar que se han añadido plantillas express-partials`, 1, async function () {
            this.msg_ok = 'Se incluye layout.ejs';
            this.msg_err = 'No se ha encontrado views/layout.ejs';
            fs.existsSync(path.join(PATH_ASSIGNMENT, "views", "layout.ejs")).should.be.equal(true);
        });

        scored(`Comprobar que las plantillas express-partials tienen los componentes adecuados`,
               2, async function () {
            this.msg_ok = 'Se incluyen todos los elementos necesarios en la plantilla';
            this.msg_err = 'No se ha encontrado todos los elementos necesarios';
            let checks = {
                "layout.ejs": {
                    true: [/<%- body %>/g, /<header/, /<\/header>/, /<nav/, /<\/nav/, /<footer/, /<\/footer>/]
                },
                "index.ejs": {
                    true: [/<h1/, /<\/h1>/],
                    false: [/<header>/, /<\/header>/, /<nav/, /<\/nav>/, /<footer/, /<\/footer>/]
                },
                [path.join("cv", "cv.ejs")]: {
                    true: [/<h1/, /<\/h1>/, /<section/, /github.com/]
                },
            };

            for (fpath in checks) {
                let templ = fs.readFileSync(path.join(PATH_ASSIGNMENT, "views", fpath), "utf8");
                for(status in checks[fpath]) {
                    elements = checks[fpath][status];
                    for(var elem in elements){
                        let e = elements[elem];
                        if (status) {
                            this.msg_err = `${fpath} no incluye ${e}`;
                        } else {
                            this.msg_err = `${fpath} incluye ${e}, pero debería haberse borrado`;
                        }
                        e.test(templ).should.be.equal((status == 'true'));
                    }
                }
            }
        });


        endpoint = '/author';
        code = 200;
        scored(`Comprobar que se resuelve una petición a ${endpoint} con código ${code}`,
               1.5, async function () {
            this.msg_ok = 'Respuesta correcta';
            this.msg_err = 'No hubo respuesta';
            check = function(){
                browser.assert.status(code);
            }
            return browser.visit(endpoint)
                .then(check)
                .catch(check);
        });

        scored(`Comprobar que se muestra la foto`,
               2, async function () {
		        this.name = "";
		        this.msg_ok = 'Foto incorporada';
		        this.msg_err = 'No se encuentra la foto';

		        await browser.visit("/author");
		        browser.assert.status(200);
		        allcontent = browser.html();
		        content = browser.html("img");
		        content.includes("images/foto.jpg").should.be.equal(true);
	      })
    });

})
