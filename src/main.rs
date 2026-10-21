mod api;
mod grid;

use api::AppState;
use axum::{Router, routing::post};
use grid::{Board, BoardTrait};
use std::sync::{Arc, Mutex};
use tower_http::services::ServeDir;

#[tokio::main]
async fn main() {
    let state = AppState {
        board: Arc::new(Mutex::new(Board::new())),
    };

    // Serve a pasta "static" na raiz do projeto (index.html, style.css, script.js)
    let app = Router::new()
        .fallback_service(ServeDir::new("static"))
        .route("/turn_minimax", post(api::turn_minimax))
        .with_state(state);

    let addr = "127.0.0.1:3000";
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    println!("Servidor rodando em http://{}", addr);

    axum::serve(listener, app).await.unwrap();
}
