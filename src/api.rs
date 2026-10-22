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
    Json(payload): Json<Request>,
) -> Result<Json<Response>, (StatusCode, &'static str)> {
    process_turn(state, payload, false).await
}

pub async fn turn_alpha_beta(
    State(state): State<AppState>,
    Json(payload): Json<Request>,
) -> Result<Json<Response>, (StatusCode, &'static str)> {
    process_turn(state, payload, true).await
}

async fn process_turn(
    state: AppState,
    payload: Request,
    use_alpha_beta: bool,
) -> Result<Json<Response>, (StatusCode, &'static str)> {
    if payload.column >= COLS {
        return Err((StatusCode::BAD_REQUEST, "coluna inválida, tente de 0-6"));
    }

    let mut board = state.board.lock().map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Erro de sincronização no servidor",
        )
    })?;

    if board.drop_piece(Cell::Yellow, payload.column).is_none() {
        return Err((StatusCode::BAD_REQUEST, "coluna cheia"));
    }

    // 1. Vitória do jogador (copia o estado final e reseta em memória)
    if board.check_win(Cell::Yellow) {
        let final_board = *board;
        *board = Board::new();
        return Ok(Json(Response {
            board: final_board,
            status: Status::Victory(Cell::Yellow),
        }));
    }

    // Empate após jogada do jogador
    if (0..COLS).all(|c| board[ROWS - 1][c] != Cell::Empty) {
        let final_board = *board;
        *board = Board::new();
        return Ok(Json(Response {
            board: final_board,
            status: Status::Draw,
        }));
    }

    // 2. Jogada da IA (Red) usando o algoritmo escolhido pela rota.
    let (ai_col, _) = if use_alpha_beta {
        board.alpha_beta_prunning(5, Player::Max, i32::MIN, i32::MAX)
    } else {
        board.minimax(5, Player::Max)
    };

    if let Some(col) = ai_col {
        board.drop_piece(Cell::Red, col);

        // Vitória da IA (copia o estado final e reseta em memória)
        if board.check_win(Cell::Red) {
            let final_board = *board;
            *board = Board::new();
            return Ok(Json(Response {
                board: final_board,
                status: Status::Victory(Cell::Red),
            }));
        }
    }

    // 3. Checa se empatou ou continua
    let full_after_ai = (0..COLS).all(|c| board[ROWS - 1][c] != Cell::Empty);
    let final_board = *board;

    let status = if full_after_ai {
        *board = Board::new();
        Status::Draw
    } else {
        Status::Ongoing
    };

    Ok(Json(Response {
        board: final_board,
        status,
    }))
}
