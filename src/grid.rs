use std::{error::Error, fmt};

#[derive(Clone, Copy, PartialEq)]
pub enum State {
    Yellow,
    Red,
    None,
}
pub type Grid = [[State; 7]; 6];
pub trait GridTrait {
    fn new() -> Self;
    fn insert(&mut self, color: State, column: u8) -> Result<Option<State>, Box<dyn Error>>;
}
impl GridTrait for Grid {
    fn new() -> Self {
        [[State::None; 7]; 6]
    }
    fn insert(&mut self, color: State, column: u8) -> Result<Option<State>, Box<dyn Error>> {
        if column >= 7 {
            return Err("there is only 7 columns 0-6".into());
        }

        let col = column as usize;

        for row in (0..6).rev() {
            if self[row][col] == State::None {
                self[row][col] = color;

                let directions: [(isize, isize); 4] = [(0, 1), (1, 0), (1, 1), (1, -1)];

                for (dr, dc) in directions {
                    let mut count = 1;

                    for mult in [1, -1] {
                        let step_r = dr * mult;
                        let step_c = dc * mult;
                        let mut r = row as isize + step_r;
                        let mut c = col as isize + step_c;

                        while r >= 0 && r < 6 && c >= 0 && c < 7 {
                            if self[r as usize][c as usize] == color {
                                count += 1;
                                r += step_r;
                                c += step_c;
                            } else {
                                break;
                            }
                        }
                    }

                    if count >= 4 {
                        return Ok(Some(color));
                    }
                }

                return Ok(None);
            }
        }

        Err("column full".into())
    }
}
impl fmt::Debug for State {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            State::None => write!(f, "⚫"),
            State::Yellow => write!(f, "🟡"),
            State::Red => write!(f, "🔴"),
        }
    }
}
