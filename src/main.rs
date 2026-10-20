use std::io::{self, Write};
mod grid;
use grid::*;
fn print_board(board: &Board) {
    println!("\n  0   1   2   3   4   5   6");
    println!("-----------------------------");
    for r in (0..ROWS).rev() {
        print!("|");
        for c in 0..COLS {
            print!(" {:?} ", board[r][c]);
        }
        println!("|");
    }
    println!("-----------------------------\n");
}

fn main() {
    let mut board = Board::new();
    let depth = 4; // Profundidade de busca da IA

    println!("========================================");
    println!("       CONNECT 4: Humano vs IA          ");
    println!("   Você: 🟡 (Yellow)  |  IA: 🔴 (Red)   ");
    println!("========================================");

    let mut current_player = Player::Min; // Humano começa

    loop {
        print_board(&board);

        match current_player {
            Player::Min => {
                print!("Sua vez (🟡)! Escolha uma coluna (0-6): ");
                io::stdout().flush().unwrap();

                let mut input = String::new();
                if io::stdin().read_line(&mut input).is_err() {
                    println!("Erro ao ler entrada.");
                    continue;
                }

                let col: usize = match input.trim().parse() {
                    Ok(num) if num < COLS => num,
                    _ => {
                        println!("Entrada inválida! Digite um número de 0 a 6.");
                        continue;
                    }
                };

                if let Some(_row) = board.drop(Cell::Yellow, col) {
                    if board.check_win(Cell::Yellow) {
                        print_board(&board);
                        println!("🎉 Parabéns! Você (🟡) venceu!");
                        break;
                    }
                    current_player = Player::Max;
                } else {
                    println!("Coluna {} está cheia! Escolha outra.", col);
                }
            }
            Player::Max => {
                println!("IA (🔴) está pensando...");

                let (best_col, score) = board.minimax(depth, Player::Max);

                if let Some(col) = best_col {
                    board.drop(Cell::Red, col);
                    println!("IA escolheu a coluna {} (Pontuação: {})", col, score);

                    if board.check_win(Cell::Red) {
                        print_board(&board);
                        println!("💻 A IA (🔴) venceu!");
                        break;
                    }
                    current_player = Player::Min;
                } else {
                    print_board(&board);
                    println!("🤝 Empate! Não há mais jogadas válidas.");
                    break;
                }
            }
        }

        // Checagem de empate por tabuleiro cheio
        if (0..COLS).all(|c| board[ROWS - 1][c] != Cell::Empty) {
            print_board(&board);
            println!("🤝 Empate! O tabuleiro está completamente cheio.");
            break;
        }
    }
}
