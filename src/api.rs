use crate::grid::*;
use axum::{Json, extract::State, http::StatusCode};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
#[derive(Clone)]
pub struct AppState {
    pub board: Arc<Mutex<Board>>,
}
#[derive(Serialize, Deserialize)]
pub enum Status {
    Victory(Cell),
    Draw,
    Ongoing,
}
#[derive(Serialize, Deserialize)]
pub struct Response {
    pub board: Board,
    pub status: Status,
}
#[derive(Serialize, Deserialize)]
pub struct Request {
    pub column: usize,
}
pub async fn turn_minimax(
    State(state): State<AppState>,
    Json(Payload): Json<Request>,
) -> Result<Json<Response>, (axum::http::StatusCode, &'static str)> {
    if Payload.column >= COLS {
        return Err((StatusCode::BAD_REQUEST, "coluna inválida, tente de 0-6"));
    }
    let mut board = state.board.lock().map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Erro de sincronização no servidor",
        )
    })?;
    if board.drop_piece(Cell::Yellow, Payload.column).is_none() {
        return Err((StatusCode::BAD_REQUEST, "coluna cheia"));
    }
    if board.check_win(Cell::Yellow) {
        return Ok(Json(Response {
            board: *board,
            status: Status::Victory(Cell::Yellow),
        }));
    }

    if (0..COLS).all(|c| board[ROWS - 1][c] != Cell::Empty) {
        let board_old = board.clone();
        *board = Board::new();
        return Ok(Json(Response {
            board: board_old,
            status: Status::Draw,
        }));
    }

    // 2. Jogada da IA (Red) via Minimax
    let (ai_col, _) = board.minimax(5, Player::Max);

    if let Some(col) = ai_col {
        board.drop_piece(Cell::Red, col);

        if board.check_win(Cell::Red) {
            return Ok(Json(Response {
                board: *board,
                status: Status::Victory(Cell::Red),
            }));
        }
    }

    let full_after_ai = (0..COLS).all(|c| board[ROWS - 1][c] != Cell::Empty);
    let status = if full_after_ai {
        *board = Board::new();
        Status::Draw
    } else {
        Status::Ongoing
    };

    Ok(Json(Response {
        board: *board,
        status,
    }))
}
