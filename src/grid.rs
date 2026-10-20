use std::{error::Error, fmt};

pub const ROWS: usize = 6;
pub const COLS: usize = 7;

#[derive(Clone, Copy, PartialEq)]
pub enum Cell {
    Empty,
    Yellow,
    Red,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Player {
    Min,
    Max,
}
pub type Board = [[Cell; COLS]; ROWS];
impl Cell {
    fn oponent(self) -> Cell {
        match self {
            Cell::Yellow => Cell::Red,
            Cell::Red => Cell::Yellow,
            Cell::Empty => Cell::Empty,
        }
    }
}
pub trait BoardTrait {
    fn new() -> Self;
    fn drop(&mut self, color: Cell, column: usize) -> Option<usize>;
    fn check_win(&self, color: Cell) -> bool;
    fn minimax(&mut self, depth: u8, player: Player) -> (Option<usize>, i32);
}
impl BoardTrait for Board {
    fn new() -> Self {
        [[Cell::Empty; COLS]; ROWS]
    }
    fn drop(&mut self, color: Cell, column: usize) -> Option<usize> {
        for row in 0..ROWS {
            if self[row][column] == Cell::Empty {
                self[row][column] = color;
                return Some(row);
            }
        }
        None
    }
    fn check_win(&self, color: Cell) -> bool {
        for r in 0..ROWS {
            for c in 0..COLS {
                if self[r][c] != color {
                    continue;
                }
                if c + 3 < COLS && (1..4).all(|x| self[r][c + x] == color) {
                    return true;
                }
                if r + 3 < ROWS && (1..4).all(|x| self[r + x][c] == color) {
                    return true;
                }
                if r + 3 < ROWS && c + 3 < COLS && (1..4).all(|x| self[r + x][c + x] == color) {
                    return true;
                }
                if r >= 3 && c + 3 < COLS && (1..4).all(|x| self[r - x][c + x] == color) {
                    return true;
                }
            }
        }
        false
    }
    fn minimax(&mut self, depth: u8, player: Player) -> (Option<usize>, i32) {
        if self.check_win(Cell::Red) {
            return (None, 1000 + depth as i32);
        }
        if self.check_win(Cell::Yellow) {
            return (None, -1000 - depth as i32);
        }
        let full = (0..COLS).all(|c| self[ROWS - 1][c] != Cell::Empty);
        if depth == 0 || full {
            return (None, 0);
        }
        match player {
            Player::Max => {
                let mut best_score = i32::MIN;
                let mut best_col = None;
                for col in 0..COLS {
                    if let Some(row) = self.drop(Cell::Red, col) {
                        let (_, score) = self.minimax(depth - 1, Player::Min);
                        self[row][col] = Cell::Empty;
                        if score > best_score || best_col.is_none() {
                            best_score = score;
                            best_col = Some(col)
                        }
                    }
                }
                (best_col, best_score)
            }
            Player::Min => {
                let mut worst_score = i32::MAX;
                let mut worst_col = None;
                for col in 0..COLS {
                    if let Some(row) = self.drop(Cell::Yellow, col) {
                        let (_, score) = self.minimax(depth - 1, Player::Max);
                        self[row][col] = Cell::Empty;
                        if score < worst_score || worst_col.is_none() {
                            worst_score = score;
                            worst_col = Some(col)
                        }
                    }
                }
                (worst_col, worst_score)
            }
        }
    }
}
impl fmt::Debug for Cell {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Cell::Empty => write!(f, "⚫"),
            Cell::Yellow => write!(f, "🟡"),
            Cell::Red => write!(f, "🔴"),
        }
    }
}
